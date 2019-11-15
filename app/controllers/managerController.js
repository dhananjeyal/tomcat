const Stock = require('../models/stock'),
    Store = require('../models/stores'),
    Product = require('../models/product'),
    Invoice = require('../models/invoices'),
    User = require('../models/users'),
    jwt = require('jsonwebtoken'),
    Joi = require('@hapi/joi'),
    mongoose = require('mongoose');



// Admin Authentication
class managerAuth {

    // Store manager login
    async login(req, res) {

        try {

            let schema = Joi.object().keys({
                userName: Joi.string().trim().label('userName').required(),
                password: Joi.string().trim().label('password').allow(''),
            });

            let {
                value,
                error
            } = Joi.validate(req.body, schema, {
                abortEarly: true
            });

            if (error)
                return res.status(500).json({
                    "status": 500,
                    "message": error.map(error => error.message)
                });

            let userData = await User.findOne({
                userName: value.userName,
                role: {
                    $eq: "Manager" // check super admin
                },
                accountStatus: {
                    $eq: 1
                }
            });

            if (userData === null) {
                return res.status(300).json({
                    "status": false,
                    message: "No such user is found"
                });
            }

            let validPassword = userData.validPassword(req.body.password);

            if (!validPassword) { // Wrong Password
                return res.status(300).json({
                    "status": 300,
                    message: " wrong password"
                });
            }
            if (userData) {

                let data = {
                    userName: userData.userName,
                    id: userData._id,
                    role: userData.role,
                    storeId: userData.storeId
                }
                let token = jwt.sign(data, process.env.API_KEY, { expiresIn: '24h' });

                return res.status(201).json({
                    status: true,
                    message: "You are logged in Successfully !",
                    //data: userData,
                    token: "Bearer " + token
                });
            }
            else {
                return res.status(300).json({
                    "status": false,
                    message: " Username is wrong"
                });
            }
        } catch (error) {
            return res.status(500).json({
                "status": 500,
                message: error.details.map(d => d.message)
            });
        }
    }

    // Get store list to display dropdown
    async getstore(req, res) {

        try {

            let store = await Store.aggregate([
                {
                    $match: {
                        storeStatus: 1
                    }
                }, {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'storeId',
                        as: 'manager'
                    }
                },
                {
                    '$unwind': {
                        path: '$manager',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $match: {
                        "manager.accountStatus": 1
                    }
                },
                {
                    $project: {
                        "_id": 1,
                        "name": 1
                    }
                }
            ]);
            return res.status(201).json({
                status: true,
                data: store,
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }



    // To check the store stock
    async productstock(req, res) {

        try {

            let data = [];
            let total = [];
            let stocks = [];
            let outofstock = [];
            let instock = [];
            // let outofstock;
            // let instock;
            let stockamount = [];
            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let skip = size * (pageNo - 1);
            let limit = size;

            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : '' // getting the search value


            //product name
            searchQuery = {
                ...searchQuery,
                ...{
                    $or: [{
                        'productdetails.name': {
                            $regex: searchKey,
                            $options: 'si'
                        }

                    }, {
                        'productdetails.serialNo': {
                            $regex: searchKey,
                            $options: 'si'
                        }
                    }, {
                        'productdetails.location': {
                            $regex: searchKey,
                            $options: 'si'
                        }
                    }]
                }
            }

            if (req.query.storeId === undefined) {
                return res.status(405).json({
                    "status": 405,
                    "message": 'store Id requried'
                });
            }
            // store Id
            let storeId = req.query.storeId;

            // If searchkey is empty
            if (searchKey === '') {
                data = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1

                        }
                    },

                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ 'productdetails.productStatus': 1 }, {
                                'productdetails.sale': 1
                            }]
                            //...searchQuery
                        }
                    },

                    {
                        $sort:
                        {
                            //"productdetails.serialNo": { $meta: "textScore" },
                            "productdetails.serialNo": -1
                        }
                    },
                    {
                        $group: {
                            _id: { name: "$productdetails.name", location: "$location" },
                            "name": { "$first": "$productdetails.name" },
                            "productId": { "$first": "$productdetails._id" },
                            "storeId": { "$first": "$_id" },
                            "location": { "$first": "$location" },
                            "rupees": { "$first": "$productdetails.retail.rupees" },
                            "dollor": { "$first": "$productdetails.retail.dollor" },
                            data: {
                                $push: {
                                    serialNo: "$productdetails.serialNo",
                                    productlocation: "$productdetails.location"
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        "$skip": skip
                    }, {
                        "$limit": limit
                    }
                ]).allowDiskUse(true);

                total = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ 'productdetails.productStatus': 1 }, {
                                'productdetails.sale': 1
                            }]
                            //...searchQuery
                        }
                    },
                    {
                        $group: {
                            _id: { name: "$productdetails.name", location: "$location" }

                        }
                    },
                    {
                        $count: 'sum'
                    }
                ]).allowDiskUse(true);


                stocks = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ 'productdetails.productStatus': 1 }, {
                                'productdetails.sale': 1
                            }]
                        }
                    },
                    {
                        $group: {
                            _id: { name: "$productdetails.name", location: "$location" },
                            // "name": { "$first": "$productdetails.name" },
                            // "location": { "$first": "$location" },
                            "rupees": { "$first": "$productdetails.retail.rupees" },
                            "dollor": { "$first": "$productdetails.retail.dollor" },
                            data: {
                                $push: {
                                    serialNo: "$productdetails.serialNo"
                                }
                            },
                            count: { $sum: 1 }
                        }
                    }

                ]).allowDiskUse(true);


                // calculating the total number of product 
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;

            }
            // if search occur
            else {

                data = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1

                        }
                    },

                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },

                    {
                        '$unwind': {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ 'productdetails.productStatus': 1 }, {
                                'productdetails.sale': 1
                            }],
                            ...searchQuery
                        }
                    },
                    {
                        $sort:
                        {
                            //"productdetails.serialNo": { $meta: "textScore" },
                            "productdetails.serialNo": -1
                        }
                    },
                    // {
                    //     "$skip": skip
                    // }, 

                    {
                        $group: {
                            _id: { name: "$productdetails.name", location: "$location" },
                            "name": { "$first": "$productdetails.name" },
                            "location": { "$first": "$location" },
                            "productId": { "$first": "$productdetails._id" },
                            "storeId": { "$first": "$_id" },
                            "rupees": { "$first": "$productdetails.retail.rupees" },
                            "dollor": { "$first": "$productdetails.retail.dollor" },
                            data: {
                                $push: {
                                    serialNo: "$productdetails.serialNo"
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        "$limit": limit
                    }

                ]).allowDiskUse(true);


                total = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1

                        }
                    },

                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ 'productdetails.productStatus': 1 }, {
                                'productdetails.sale': 1
                            }],
                            ...searchQuery
                        }
                    },
                    {
                        $group: {
                            _id: { name: "$productdetails.name", location: "$location" }

                        }
                    },
                    {
                        $count: 'sum'
                    }

                ]).allowDiskUse(true);

                // calculating the total number of product 
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;

                stocks = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{
                                "productdetails.productStatus": 1,
                            }, {
                                "productdetails.sale": 1,
                            }],
                            ...searchQuery
                        }
                    },
                    {
                        $group: {
                            _id: { name: "$productdetails.name", location: "$location" },
                            // "name": { "$first": "$productdetails.name" },
                            // "location": { "$first": "$location" },
                            "rupees": { "$first": "$productdetails.retail.rupees" },
                            "dollor": { "$first": "$productdetails.retail.dollor" },
                            data: {
                                $push: {
                                    serialNo: "$productdetails.serialNo"
                                }
                            },
                            count: { $sum: 1 }
                        }
                    }
                ]).allowDiskUse(true);

            }


            // check datas occur or not
            if (stocks.length > 0) {
                //Check out of stock or instock 
                for (const docs of stocks) {

                    if (docs.count >= 1) {
                        instock.push(docs.count);
                        let amount = docs.count * docs.dollor
                        stockamount.push(amount);
                    }
                    else {
                        outofstock.push(docs.count);
                    }
                }

                // for (const docs of stocks) {
                //     if (docs) {
                //         instock = stocks.length;
                //         let amount = docs.productdetails.retail.dollor;
                //         stockamount.push(amount);
                //     }
                //     else {
                //         outofstock.push(stocks.length);
                //     }
                // }
            }

            // To get the total stocks

            const sumofoutofstock = outofstock.reduce((partial_sum, a) => partial_sum + a, 0);
            //const sumofinstock = instock.length;
            const sumofinstock = instock.reduce((partial_sum, a) => partial_sum + a, 0);

            // To get the total amount which are in the stock
            const amount = stockamount.reduce((partial_sum, a) => partial_sum + a, 0);

            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send
                'total': total, // total data
                'skip': skip, // skip numbers
                'limit': limit, // limit 
                'outofstock': sumofoutofstock, // out of stock
                'instock': sumofinstock, // in stock
                'stockvalue': amount // stock value which is in stock
            });

        } catch (error) {
            return res.status(500).json({
                "status": 0,
                message: error
            });
        }
    }


    // To view the stock
    async editstock(req, res) {

        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let data = [];
            let total = [];
            let skip = size * (pageNo - 1);
            let limit = size;

            if (req.params.storeId === undefined) {
                return res.status(405).json({
                    "status": 405,
                    "message": 'store Id requried'
                });
            }
            //product name
            if (req.query.name === undefined || req.query.name === '') {
                return res.status(422).json({
                    "status": 422,
                    "message": "product name is requried"
                });
            }


            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : ''
            let storeId = req.params.storeId;
            let name = req.query.name.toLowerCase(); // product category


            //product name search by only serianNo
            searchQuery = {
                ...searchQuery,
                ...{
                    $or: [{
                        'productdetails.name': {
                            $regex: searchKey,
                            $options: 'si'
                        }

                    }, {
                        'productdetails.serialNo': {
                            $regex: searchKey,
                            $options: 'si'
                        }
                    }]
                }
            }

            if (searchKey === '') {
                data = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1,
                        }
                    }, {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        $unwind: {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    }, {
                        $match: {
                            $and: [{ "productdetails.name": name, }, { "productdetails.productStatus": 1 },
                            { "productdetails.sale": 1 }]
                        }
                    }, {
                        $skip: skip
                    }, {
                        $limit: limit
                    },
                    {
                        $group: {
                            _id: "$_id",
                            data: {
                                $push: {
                                    productId: "$productdetails._id",
                                    name: "$productdetails.name",
                                    location: "$productdetails.location",
                                    currentLocation: "$productdetails.currentLocation",
                                    category: "$productdetails.category",
                                    serialNo: "$productdetails.serialNo",
                                    retail: "$productdetails.retail",
                                    wholesale: "$productdetails.wholesale",
                                    weight: "$productdetails.weight",
                                    size: "$productdetails.size",
                                    measurement: "$productdetails.measurement",
                                    image: "$productdetails.image",
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            data: 1
                        }
                    }
                ]).allowDiskUse(true);


                total = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1,
                        }
                    }, {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        $unwind: {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ "productdetails.name": name, }, { "productdetails.productStatus": 1 },
                            { "productdetails.sale": 1 }]
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            count: { $sum: 1 }
                        }
                    },


                ]).allowDiskUse(true);


                // calculating the total number of product 
                if (total[0] !== undefined)
                    total = total[0].count;
                else
                    total = 0;
            }
            else {

                data = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1,
                        }
                    }, {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        $unwind: {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{
                                "productdetails.name": name,
                            }, {
                                "productdetails.productStatus": 1,
                            }, {
                                "productdetails.sale": 1,
                            }],
                            ...searchQuery
                        }
                    }, {
                        $limit: limit
                    },
                    {
                        $group: {
                            _id: "$_id",
                            data: {
                                $push: {
                                    productId: "$productdetails._id",
                                    name: "$productdetails.name",
                                    location: "$productdetails.location",
                                    currentLocation: "$productdetails.currentLocation",
                                    category: "$productdetails.category",
                                    serialNo: "$productdetails.serialNo",
                                    retail: "$productdetails.retail",
                                    wholesale: "$productdetails.wholesale",
                                    weight: "$productdetails.weight",
                                    size: "$productdetails.size",
                                    measurement: "$productdetails.measurement",
                                    image: "$productdetails.image",
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            data: 1
                        }
                    }

                ]).allowDiskUse(true);


                total = await Store.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(storeId),
                            storeStatus: 1,
                        }
                    }, {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'productdetails'
                        }
                    },
                    {
                        $unwind: {
                            path: '$productdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{
                                "productdetails.name": name,
                            }, {
                                "productdetails.productStatus": 1,
                            }, {
                                "productdetails.sale": 1,
                            }],
                            ...searchQuery
                        }
                    }, {
                        $group: {
                            _id: "$_id",
                            count: { $sum: 1 }
                        }
                    },

                ]).allowDiskUse(true);


                // calculating the total number of product 
                if (total[0] !== undefined)
                    total = total[0].count;
                else
                    total = 0;

            }

            if (data[0] === undefined) {
                return res.status(422).json({
                    'status': 422,
                    'message': "No data"
                })
            }

            data[0].data.map((val) => {
                if (val.image !== undefined && val.image !== '')
                    val.image = process.env.ImageUrl + 'product_img/' + val.image;
            });


            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send
                'total': total, // total data available
                'skip': skip, // skip numbers
                'limit': limit // limit 
            });

        } catch (error) {
            console.log('err-->', error);

            return res.status(500).json({
                "status": 0,
                message: error.details.map(d => d.message)
            });
        }
    }


    // update stock means create a new product
    async updatestock(req, res) {
        try {

            if (req.query.storeId === undefined && req.query.storeId === "") {
                return res.status(405).json({
                    "status": 405,
                    "message": 'store Id requried'
                });
            }

            if (req.query.productId === undefined && req.query.productId === "") {
                return res.status(405).json({
                    "status": 405,
                    "message": 'product Id requried'
                });
            }

            let storeId = req.query.storeId;
            let productId = req.query.productId;


            let schema = Joi.object().keys({
                serialNo: Joi.string().trim().alphanum().label('serialNo').required(),
            });

            let { value, error } = Joi.validate(req.body, schema, {
                abortEarly: true
            });

            if (error) {
                return res.status(500).json({
                    "status": 500,
                    "message": error.map(error => error.message)
                });
            }

            let productData = await Product.findOne({
                "serialNo": value.serialNo,
                "productStatus": 1
            }).lean();

            if (productData !== null && productData.productStatus == 2) {

                let product = await Product.findOne({ "_id": productId }).lean();

                await Product.findByIdAndUpdate(productData._id, {
                    productStatus: 1,
                    name: product.name.toLowerCase(),
                    detail: product.detail,
                    location: value.location.toLowerCase(),
                    category: product.category.toLowerCase(),
                    serialNo: product.serialNo,
                    retail: product.retail,
                    wholesale: product.wholesale,
                    weight: product.weight,
                    size: product.size,
                    measurement: product.measurement,
                    storeId: storeId,
                    userId: req.user._id
                });

                return res.status(201).json({
                    "status": 201,
                    message: "product is added created successfully"
                });
            }

            else if (productData !== null && productData.productStatus == 1) {
                return res.status(422).json({
                    "status": 422,
                    message: "product Serial Number is already exist"
                });
            }

            let product = await Product.findOne({ "_id": productId }).lean();

            let data = new Product({
                name: product.name.toLowerCase(),
                detail: product.detail,
                size: product.size,
                category: product.category.toLowerCase(),
                location: product.location.toLowerCase(),
                serialNo: value.serialNo,
                retail: product.retail,
                wholesale: product.wholesale,
                weight: product.weight,
                measurement: product.measurement,
                storeId: storeId,
                userId: req.user._id
            });

            await data.save();

            return res.status(201).json({
                'status': 201,
                'message': "product stock has been updated successfully"

            });

        } catch (error) {
            return res.status(500).json({
                "status": 0,
                message: error
            });
        }
    }

    //To get the sale of the particular product
    async sale(req, res) {

        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let data = [];
            let total = [];
            let skip = size * (pageNo - 1);
            let limit = size;
            let productId = req.query.productId;

            data = await Invoice.aggregate([
                {
                    $match: {
                        "products.productId": mongoose.Types.ObjectId(productId),
                        "invoiceDelete": 1,
                    }
                },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customerId',
                        foreignField: '_id',
                        as: 'customerdetails'
                    }
                },
                {
                    $unwind: {
                        path: '$customerdetails',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $match: {
                        'customerdetails.customerStatus': 1
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storedetails'
                    }
                },
                {
                    $unwind: {
                        path: '$storedetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        'storedetails.storeStatus': 1
                    }
                },
                {
                    $project: {
                        _id: 1,
                        invoiceNo: 1,
                        "customerdetails.name": 1,
                        "storedetails.location": 1,
                    }
                },
                {
                    "$skip": skip
                }, {
                    "$limit": limit
                }
            ]);

            total = await Invoice.aggregate([
                {
                    $match: {
                        "products.productId": mongoose.Types.ObjectId(productId),
                        "invoiceDelete": 1,
                    }
                },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customerId',
                        foreignField: '_id',
                        as: 'customerdetails'
                    }
                },
                {
                    $unwind: {
                        path: '$customerdetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storedetails'
                    }
                },
                {
                    $unwind: {
                        path: '$storedetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        invoiceNo: 1,
                        "customerdetails.name": 1,
                        "storedetails.location": 1,
                    }
                },
                {
                    $count: 'sum'
                }
            ]);

            // calculating the total number of product 
            if (total[0] !== undefined)
                total = total[0].sum;
            else
                total = 0;

            return res.status(200).json({
                "status": 1,
                'data': data, // data that needs to be send
                'total': total, // total data available
                'skip': skip, // skip numbers
                'limit': limit // limit 
            });
        } catch (error) {
            return res.status(500).json({
                "status": 0,
                message: error.details.map(d => d.message)
            });
        }
    }

    // Dashboard bar chart for sales in month
    async barchart(req, res) {

        try {

            let searchQuery = {},
                searchKey = req.query.date !== undefined ? req.query.date.toLowerCase() : '';

            if (searchKey != '') {

                let date = new Date(searchKey);
                let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                firstDay.setHours(0, 0, 0, 0);

                let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                lastDay.setHours(0, 0, 0, 0);

                searchQuery = {
                    ...searchQuery,
                    ...{
                        'invoicesdetails.billDate': {
                            $gte: firstDay,
                            $lte: lastDay
                        }
                    }
                }
            }

            else {
                //To get the current month of start and end
                let date = new Date(searchKey);
                let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                firstDay.setHours(0, 0, 0, 0);

                let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                firstDay.setHours(0, 0, 0, 0);

                searchQuery = {
                    ...searchQuery,
                    ...{
                        'invoicesdetails.billDate': {
                            $gte: firstDay,
                            $lte: lastDay
                        }
                    }
                }
            }

            let data = await User.aggregate([
                {
                    $match: {
                        role: "Manager",
                        accountStatus: 1,
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storedetails'
                    }
                },
                {
                    $unwind: {
                        path: '$storedetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'invoices',
                        localField: 'storedetails._id',
                        foreignField: 'storeId',
                        as: 'invoicesdetails'
                    }
                },
                {
                    $unwind: {
                        path: '$invoicesdetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        ...searchQuery
                    }
                },

                {
                    $group: {
                        _id: "$storedetails.name",
                        sales: { $sum: 1 }
                    }
                },
                {
                    "$match": { "sales": { "$gt": 0 } }
                }

            ]).allowDiskUse(true);

            return res.status(200).json({
                "status": 1,
                'data': data, // data that needs to be send

            });

        } catch (error) {
            return res.status(500).json({
                "status": 0,
                message: error.details.map(d => d.message)
            });
        }

    }

    // Dashboard piechart inventory
    async piechart(req, res) {
        try {

            let data = await Store.aggregate([
                {
                    $match: {
                        storeStatus: 1
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'storeId',
                        as: 'productdetails'
                    }
                },
                {
                    '$unwind': {
                        path: '$productdetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        $and: [{ 'productdetails.productStatus': 1 }, {
                            'productdetails.sale': 1
                        }]
                    }
                },
                {
                    $group: {
                        _id: { location: "$location" },//name: "$productdetails.name",
                        "storename": { "$first": "$name" },
                        data: {
                            $addToSet: {
                                serialNo: "$productdetails.serialNo"
                            }
                        },
                        inventory: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        storename: 1,
                        inventory: 1
                    }
                }

            ]).allowDiskUse(true);

            return res.status(200).json({
                "status": 1,
                'data': data, // data that needs to be send

            });

        } catch (error) {
            return res.status(500).json({
                "status": 0,
                message: error.details.map(d => d.message)
            });
        }
    }


}
managerAuth = new managerAuth();
module.exports = managerAuth;