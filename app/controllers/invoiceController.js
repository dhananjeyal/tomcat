const Product = require('../models/product'),
    Stock = require('../models/stock'),
    Store = require('../models/stores'),
    Customer = require('../models/customers'),
    User = require('../models/users'),
    Invoice = require('../models/invoices'),
    mongoose = require('mongoose'),
    Joi = require('@hapi/joi'),
    invoicepdf = require('../../helpers/invoicehtml');

// Admin Authentication
class invoiceAuth {

    //To get product while invoice creation
    async productlist(req, res) {
        try {


            // for admin require storeId
            if (req.user.role === "admin") {
                var storeId = req.query.storeId;
            }

            if (req.query.storeId === '')
                return res.status(401).json({
                    "message": 'store Id is requried'
                });


            let data = [];
            let endata = []; //End data
            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : '' // getting the search value

            // product name 
            searchQuery = {
                ...searchQuery,
                ...{
                    'productdetails.name': {
                        $regex: searchKey,
                        $options: 'ixs'
                    }

                }
            }

            // For Manager
            if (req.user.role === 'Manager') {
                let ManagerId = req.user._id;

                data = await User.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(ManagerId),
                            accountStatus: 1
                        }
                    }, {
                        $lookup: {
                            from: 'stores',
                            localField: 'storeId',
                            foreignField: '_id',
                            as: 'managerstore'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$managerstore',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            "managerstore.storeStatus": 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'managerstore._id',
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
                            'productdetails.productStatus': 1,
                            ...searchQuery
                        }
                    },
                    {
                        $group: {
                            _id: '$productdetails.name',
                            "storeId": { "$first": "$_id" },
                            "location": { "$first": "$productdetails.location" },
                        }
                    }
                ]).allowDiskUse(true);
            }
            // For super admin
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
                            'productdetails.productStatus': 1,
                            ...searchQuery
                        }
                    },
                    {
                        $group: {
                            _id: '$productdetails.name',
                            "storeId": { "$first": "$_id" },
                            "location": { "$first": "$productdetails.location" },

                        }
                    }
                ]).allowDiskUse(true);
            }


            if (data[0] === undefined) {
                return res.status(200).json({
                    'status': 200,
                    'message': "No prouduct for this store",
                });
            }

            //For the rupees or dollor using storelocation
            // for (const docs of data[0].data) {
            //     if (docs.storelocation === "india") {
            //         docs.rupees = docs.rupees //changed to rupees for frontend key
            //     }
            //     else {
            //         docs.rupees = docs.dollor
            //     }
            // }

            return res.status(200).json({
                'status': 200,
                'data': data,
            });
        }

        catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }

    //To get the list of serialNo with productname and location
    async listserialno(req, res) {
        try {

            if (req.query.name === undefined || req.query.name === '') {
                return res.status(422).json({
                    "status": 422,
                    "message": "name is requried"
                });
            }

            if (req.query.location === undefined || req.query.location === '') {
                return res.status(422).json({
                    "status": 422,
                    "message": "location is requried"
                });
            }


            let name = req.query.name.toLowerCase(); // product category
            let location = req.query.location.toLowerCase();

            let data = await Product.aggregate([
                {
                    $match: {
                        $and: [{ name: name }, { location: location }, { productStatus: 1 }, { sale: 1 }]
                    }
                }
            ]);

            if (data === undefined) {
                return res.status(422).json({
                    'status': 422,
                    'message': "No data"
                })
            }

            data.map((val) => {
                if (val.image !== undefined && val.image !== '')
                    val.image = process.env.ImageUrl + 'product_img/' + val.image;
            });

            //For the rupees or dollor using storelocation
            // for (const docs of data) {
            //     if (docs.location === "india") {
            //         docs.retail.rupees = docs.retail.rupees //changed to rupees for frontend key
            //     }
            //     else {
            //         docs.retail.rupees = docs.retail.dollor
            //     }
            // }

            return res.status(200).json({
                'status': 200,
                'data': data,
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }



    // customer list in invoice creation
    async customerlist(req, res) {
        try {

            let data = [];
            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : '' // getting the search value
            // search email or name or mobilenumber
            searchQuery = {
                ...searchQuery,
                ...{
                    'name': {
                        $regex: searchKey,
                        $options: 'ixs'
                    }
                }
            }

            if (searchKey === '') {
                data = await Customer.aggregate([
                    {
                        $match: {
                            "customerStatus": 1
                        }
                    },
                    {
                        $sort: {
                            "createdAt": -1
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1
                        }
                    }
                ]).allowDiskUse(true);
            }
            else {
                data = await Customer.aggregate([
                    {
                        $match: {
                            "customerStatus": 1,
                            ...searchQuery
                        }
                    },
                    {
                        $sort: {
                            "createdAt": -1
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1
                        }
                    }
                ]).allowDiskUse(true);
            }

            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send

            });


        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }

    }


    // Add invoice new creation
    async addinvoice(req, res) {
        try {

            const productDetailObject = Joi.object({
                productId: Joi.string().label('productId').required(),
                price: Joi.number().label('price of product').required()
            });

            const productDetailArraySchema = Joi.array().items(productDetailObject).required();

            //Joi validation
            let schema = Joi.object().keys({
                storeId: Joi.string().label('storeId').required(),
                totalamount: Joi.number().label('totalamount').required(),
                customerId: Joi.string().label('customerId').required(),
                product: Joi.alternatives().try(productDetailObject, productDetailArraySchema).label('product'),
                discount: Joi.number().label('discount').allow(''),
                tax: Joi.number().label('tax').required(),
                discountAmount: Joi.number().label('discountAmount').allow(''),
                taxAmount: Joi.number().label('taxamount').required(),
                subTotal: Joi.number().label('subTotal').required(),
                //  address: Joi.string().label('Address of invoice').required(),
                invoiceNo: Joi.string().label('invoice Number').required(),
                taxNumber: Joi.string().label('tax Number').required(),
                address: Joi.string().label('invoiceAddress').allow(''),
                priceType: Joi.string().valid(['rupees', 'dollor', 'dinar', 'pounds', 'euro']).label('priceType').required()
            });

            let { value, error } = Joi.validate(req.body, schema, {
                abortEarly: false
            });

            if (error) {
                console.log('error-->', error);
                return res.status(500).json({
                    "status": "validation error",
                    "message": error.map(error => error.message)
                });
            }

            let storeId = value.storeId, //Store id
                total = value.totalamount,
                saledBy = req.user._id, // Admin
                customerId = value.customerId,
                discount = value.discount, // discount percentage
                tax = value.tax,// tax percentage
                discountAmount = value.discountAmount,
                taxAmount = value.taxAmount,
                subTotal = value.subTotal,
                taxNumber = value.taxNumber,
                invoiceAddress = value.address, //invoiceAddress
                invoiceNo = value.invoiceNo,
                priceType = value.priceType,
                products = []; //Going to sale product  
            //Check Admin
            if (req.user.role === "admin") {

                //Check invoice number is Already Exist
                let invoiceNumberExist = await Invoice.findOne({ 'invoiceNo': invoiceNo, 'invoiceDelete': 1 });

                if (invoiceNumberExist !== null && invoiceNumberExist !== '') {
                    return res.status(500).json({
                        "status": false,
                        "message": 'Please insert unique invoice number'
                    });
                }

                for (const docs of value.product) {
                    let data = await Product.aggregate([
                        {
                            $match: {
                                $and: [{ _id: mongoose.Types.ObjectId(docs.productId) }, { productStatus: 1 }, { sale: 1 }]
                            }
                        }
                    ]);
                    // sale product
                    let saleproduct = {
                        productId: data[0]._id,
                        price: docs.price,
                    }
                    products.push(saleproduct);
                    await Product.findByIdAndUpdate({ _id: data[0]._id }, { $set: { "sale": 2, 'productStatus': 2 } });
                }
                //Invoice object
                let invoice = {
                    invoiceNo: invoiceNo,
                    billDate: new Date(),
                    storeId: storeId,
                    customerId: customerId,
                    total: total,
                    discount: discount,
                    tax: tax,
                    discountAmount: discountAmount,
                    taxAmount: taxAmount,
                    subTotal: subTotal,
                    saledBy: saledBy,
                    products: products,
                    invoiceDelete: 1,
                    // sufix: sufix++,
                    taxNumber: taxNumber,
                    priceType: priceType,
                    invoiceAddress: invoiceAddress
                }

                let invoicedata = await new Invoice(invoice).save();


                // remove the products after invoice created

                let datainvoice = await Invoice.aggregate([
                    {
                        $match: {
                            //_id: mongoose.Types.ObjectId(invoicedata._id)
                            $and: [{ _id: mongoose.Types.ObjectId(invoicedata._id) }, { invoiceDelete: 1 }]
                        }
                    },
                    {
                        $unwind: {
                            path: '$products',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'products.productId',
                            foreignField: '_id',
                            as: 'products.productsdetails' //push the product into the same array of product invoice
                        }
                    },
                    {
                        $unwind: {
                            path: '$products.productsdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ "products.productsdetails.productStatus": 2 }, { "products.productsdetails.sale": 2 }]
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'storeId',
                            foreignField: 'storeId',
                            as: 'managerdetails'
                        }
                    },
                    {
                        $unwind: {
                            path: '$managerdetails',
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
                        "$group": {
                            "_id": "$_id",
                            "invoiceNo": { "$first": "$invoiceNo" },
                            "billDate": { "$first": "$billDate" },
                            "total": { "$first": "$total" },
                            "subtotal": { "$first": "$subTotal" },
                            "discount": { "$first": "$discount" },
                            "discountAmount": { "$first": "$discountAmount" },
                            "tax": { "$first": "$tax" },
                            "taxAmount": { "$first": "$taxAmount" },
                            'taxNumber': { '$first': '$taxNumber' },
                            'invoiceAddress': { '$first': '$invoiceAddress' },
                            "products": {
                                "$push": {
                                    //quantity: "$products.quantity",
                                    //totalPrice: "$products.totalPrice",
                                    productname: "$products.productsdetails.name",
                                    //productprice: "$products.productsdetails.price",
                                    productprice: "$products.price", //Taking price from invoice product array
                                    serialNo: "$products.productsdetails.serialNo"
                                }
                            }, // product with productdetails array
                            data: {
                                $addToSet: {
                                    managername: '$managerdetails.managerName',
                                    storename: '$storedetails.name',
                                    storelocation: "$storedetails.location",
                                    storecountrycode: "$storedetails.countryCode",
                                    storenumber: "$storedetails.number",
                                    storeaddress: '$storedetails.address',
                                    storename: '$storedetails.name',
                                    customeremail: '$customerdetails.email',
                                    customeraddress: "$customerdetails.address",
                                    customercountry: "$customerdetails.country",
                                    customercountryCode: "$customerdetails.countryCode",
                                    customermobileNumber: "$customerdetails.mobileNumber",
                                    customername: "$customerdetails.name"
                                }
                            }
                        }
                    },
                ]);

                await invoicepdf.createhtml(datainvoice);
                return res.status(201).json({
                    "status": 201,
                    message: "Invoice as been created successfully"
                });

            }
            // If Manager login
            else {

                //Check invoice number is Already Exist
                //Check invoice number is Already Exist
                let invoiceNumberExist = await Invoice.findOne({ 'invoiceNo': invoiceNo, 'invoiceDelete': 1 });

                if (invoiceNumberExist !== null && invoiceNumberExist !== '') {
                    return res.status(500).json({
                        "status": false,
                        "message": 'Please insert unique invoice number'
                    });
                }

                for (const docs of value.product) {
                    let data = await Product.aggregate([
                        {
                            $match: {
                                _id: mongoose.Types.ObjectId(docs.productId),
                                $and: [{ productStatus: 1 }, { sale: 1 }]
                            }
                        }
                    ]);

                    // sale product
                    let saleproduct = {
                        productId: data[0]._id,
                        price: docs.price,
                    }

                    products.push(saleproduct);

                    await Product.findByIdAndUpdate({ _id: data[0]._id }, { $set: { "sale": 2, 'productStatus': 2 } });

                }


                let invoice = {
                    invoiceNo: invoiceNo,
                    billDate: new Date(),
                    storeId: storeId,
                    customerId: customerId,
                    total: total,
                    discount: discount,
                    tax: tax,
                    discountAmount: discountAmount,
                    taxAmount: taxAmount,
                    subTotal: subTotal,
                    saledBy: saledBy,
                    products: products,
                    //sufix: sufix++,
                    invoiceDelete: 1,
                    taxNumber: taxNumber,
                    priceType: priceType,
                    invoiceAddress: invoiceAddress
                }


                let invoicedata = await new Invoice(invoice).save();


                let datainvoice = await Invoice.aggregate([
                    {
                        $match: {
                            //_id: mongoose.Types.ObjectId(invoicedata._id)
                            $and: [{ _id: mongoose.Types.ObjectId(invoicedata._id) }, { invoiceDelete: 1 }]
                        }
                    },
                    {
                        $unwind: {
                            path: '$products',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'products.productId',
                            foreignField: '_id',
                            as: 'products.productsdetails' //push the product into the same array of product invoice
                        }
                    },
                    {
                        $unwind: {
                            path: '$products.productsdetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            $and: [{ "products.productsdetails.productStatus": 2 }, { "products.productsdetails.sale": 2 }]
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'storeId',
                            foreignField: 'storeId',
                            as: 'managerdetails'
                        }
                    },
                    {
                        $unwind: {
                            path: '$managerdetails',
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
                        "$group": {
                            "_id": "$_id",
                            "invoiceNo": { "$first": "$invoiceNo" },
                            "billDate": { "$first": "$billDate" },
                            "total": { "$first": "$total" },
                            'taxNumber': { '$first': '$taxNumber' },
                            'invoiceAddress': { '$first': '$invoiceAddress' },
                            "subtotal": { "$first": "$subTotal" },
                            "discount": { "$first": "$discount" },
                            "discountAmount": { "$first": "$discountAmount" },
                            "tax": { "$first": "$tax" },
                            "taxAmount": { "$first": "$taxAmount" },
                            "products": {
                                "$push": {
                                    //quantity: "$products.quantity",
                                    //totalPrice: "$products.totalPrice",
                                    productname: "$products.productsdetails.name",
                                    //productprice: "$products.productsdetails.price",
                                    productprice: "$products.price", //Taking price from invoice product array
                                    serialNo: "$products.productsdetails.serialNo"
                                }
                            }, // product with productdetails array
                            data: {
                                $addToSet: {
                                    managername: '$managerdetails.managerName',
                                    storename: '$storedetails.name',
                                    storelocation: "$storedetails.location",
                                    storecountrycode: "$storedetails.countryCode",
                                    storenumber: "$storedetails.number",
                                    storeaddress: '$storedetails.address',
                                    storename: '$storedetails.name',
                                    customeremail: '$customerdetails.email',
                                    customeraddress: "$customerdetails.address",
                                    customercountry: "$customerdetails.country",
                                    customercountryCode: "$customerdetails.countryCode",
                                    customermobileNumber: "$customerdetails.mobileNumber",
                                    customername: "$customerdetails.name"
                                }
                            }
                        }
                    },
                ]);


                await invoicepdf.createhtml(datainvoice);

                return res.status(201).json({
                    "status": 201,
                    message: "Invoice as been created successfully"
                });

            }


        }
        catch (error) {
            console.log('catch-->', error)
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }



    // To get the invoice with search 
    async getinvoice(req, res) {


        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let skip = size * (pageNo - 1);
            let limit = size;
            let data = [];
            let total = [];

            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : '' // getting the search value
            let searchType = req.query.searchType !== undefined ? req.query.searchType.toLowerCase() : ''; // getting the search type



            // search invoice by or name  or mobilenumber
            if (searchType === 'customer') {
                searchQuery = {
                    ...searchQuery,
                    ...{
                        $or: [{
                            'customerdetail.mobileNumber': {
                                $regex: searchKey,
                                $options: 'ixs'
                            }
                        },
                        {
                            'customerdetail.email': {
                                $regex: searchKey,
                                $options: 'ixs'
                            }
                        }, {
                            'customerdetail.name': {
                                $regex: searchKey,
                                $options: 'ixs'
                            }
                        },
                        {
                            'location': {
                                $regex: searchKey,
                                $options: 'ixs'
                            }
                        },
                        {
                            'invoicedetails.invoiceNo': {
                                $regex: searchKey,
                                $options: 'ixs'
                            }
                        }]
                    }
                }
            }

            // search invoice by daterange
            if (searchType === 'daterange') {
                let startDate = new Date(searchKey);
                startDate.setHours(0, 0, 0, 0);

                let endDate = new Date(searchKey);
                endDate.setHours(23, 59, 59, 999);

                searchQuery = {
                    ...searchQuery,
                    ...{
                        'invoicedetails.billDate': {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                }
            }

            // for admin
            if (searchType === "date") {

                let startDate = new Date(searchKey.split('.')[0]);
                startDate.setHours(0, 0, 0, 0);

                let endDate = new Date(searchKey.split('.')[1]);
                endDate.setHours(23, 59, 59, 999);

                searchQuery = {
                    ...searchQuery,
                    ...{
                        'invoicedetails.billDate': {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                }

            }

            // store Id 
            let storeId;

            // For Admin
            if (req.user.role === 'admin') {
                storeId = req.query.storeId || req.user._id;
            }

            // For Manager
            else {
                storeId = req.query.storeId || req.user.storeId;
            }

            if (searchKey === '') {
                data = await Store.aggregate([
                    {
                        $match: {
                            $or: [{ _id: mongoose.Types.ObjectId(storeId) }, { userId: mongoose.Types.ObjectId(storeId) }],
                            storeStatus: 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'invoices',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'invoicedetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$invoicedetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'invoicedetails.invoiceDelete': 1,
                        }
                    },
                    {
                        $sort: {
                            "invoicedetails.createdAt": -1
                        }
                    },
                    {
                        $lookup: {
                            from: 'customers',
                            localField: 'invoicedetails.customerId',
                            foreignField: '_id',
                            as: 'customerdetail'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$customerdetail',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'customerdetail.customerStatus': 1,
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            location: 1,
                            name: 1,
                            "invoicedetails._id": 1,
                            "invoicedetails.invoiceNo": 1,
                            "invoicedetails.billDate": 1,
                            "invoicedetails.total": 1,
                            "invoicedetails.invoiceDelete": 1,
                            "customerdetail.name": 1,
                            "customerdetail.mobileNumber": 1,
                            "customerdetail.customerStatus": 1,
                            "customerdetail.countryCode": 1,
                            'invoicedetails.priceType': 1
                        }
                    },
                    {
                        "$skip": skip
                    }, {
                        "$limit": limit
                    }
                ]);


                total = await Store.aggregate([
                    {
                        $match: {
                            $or: [{ _id: mongoose.Types.ObjectId(storeId) }, { userId: mongoose.Types.ObjectId(storeId) }],
                            storeStatus: 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'invoices',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'invoicedetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$invoicedetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'invoicedetails.invoiceDelete': 1,
                            //...searchQuery
                        }
                    },
                    {
                        $sort: {
                            "invoicedetails.createdAt": -1
                        }
                    },
                    {
                        $lookup: {
                            from: 'customers',
                            localField: 'invoicedetails.customerId',
                            foreignField: '_id',
                            as: 'customerdetail'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$customerdetail',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'customerdetail.customerStatus': 1,
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            location: 1,
                            name: 1,
                            "invoicedetails._id": 1,
                            "invoicedetails.invoiceNo": 1,
                            "invoicedetails.billDate": 1,
                            "invoicedetails.invoiceDelete": 1,
                            "invoicedetails.total": 1,
                            "customerdetail.name": 1,
                            "customerdetail.customerStatus": 1,
                            "customerdetail.mobileNumber": 1,
                            "customerdetail.countryCode": 1,

                        }
                    },
                    {
                        $count: 'sum'
                    }
                ]);

                // calculating the total number of invoice 
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;


            }
            else {
                data = await Store.aggregate([
                    {
                        $match: {
                            $or: [{ _id: mongoose.Types.ObjectId(storeId) }, { userId: mongoose.Types.ObjectId(storeId) }],
                            storeStatus: 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'invoices',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'invoicedetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$invoicedetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'invoicedetails.invoiceDelete': 1,
                        }
                    },
                    {
                        $sort: {
                            "invoicedetails.createdAt": 1
                        }
                    },

                    {
                        $lookup: {
                            from: 'customers',
                            localField: 'invoicedetails.customerId',
                            foreignField: '_id',
                            as: 'customerdetail'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$customerdetail',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'customerdetail.customerStatus': 1,
                        }
                    },
                    {
                        $match: {
                            ...searchQuery
                        }
                    },

                    {
                        $project: {
                            _id: 1,
                            location: 1,
                            name: 1,
                            "invoicedetails._id": 1,
                            "invoicedetails.invoiceNo": 1,
                            "invoicedetails.billDate": 1,
                            "invoicedetails.total": 1,
                            "customerdetail.name": 1,
                            "customerdetail.mobileNumber": 1,
                            "customerdetail.countryCode": 1,
                            'invoicedetails.priceType': 1
                        }
                    },

                    {
                        "$limit": limit
                    },
                    // {
                    //     "$skip": skip
                    // },
                ]);

                total = await Store.aggregate([
                    {
                        $match: {
                            $or: [{ _id: mongoose.Types.ObjectId(storeId) }, { userId: mongoose.Types.ObjectId(storeId) }],
                            storeStatus: 1

                        }
                    },
                    {
                        $lookup: {
                            from: 'invoices',
                            localField: '_id',
                            foreignField: 'storeId',
                            as: 'invoicedetails'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$invoicedetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'invoicedetails.invoiceDelete': 1,
                        }
                    },
                    {
                        $sort: {
                            "invoicedetails.createdAt": 1
                        }
                    },
                    {
                        $lookup: {
                            from: 'customers',
                            localField: 'invoicedetails.customerId',
                            foreignField: '_id',
                            as: 'customerdetail'
                        }
                    },
                    {
                        '$unwind': {
                            path: '$customerdetail',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            'customerdetail.customerStatus': 1,
                        }
                    },
                    {
                        $match: {
                            ...searchQuery
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            location: 1,
                            name: 1,
                            "invoicedetails._id": 1,
                            "invoicedetails.invoiceNo": 1,
                            "invoicedetails.billDate": 1,
                            "invoicedetails.total": 1,
                            "customerdetail.name": 1,
                            "customerdetail.mobileNumber": 1,
                            "customerdetail.countryCode": 1,

                        }
                    },
                    {
                        $count: 'sum'
                    }
                ]);

                // calculating the total number of invoice 
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;
            }

            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send
                'total': total, // total data
                'skip': skip, // skip numbers
                'limit': limit, // limit 

            });

        }
        catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }


    // to get the particular invoice
    async perinvoice(req, res) {

        try {

            if (req.params.invoiceId === undefined || req.params.invoiceId === '') {
                return res.status(403).json({
                    "status": 403,
                    "message": 'invoice id is requried'
                });
            }

            let invoiceId = req.params.invoiceId;

            let data = await Invoice.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(invoiceId),
                        invoiceDelete: 1
                    }
                },
                {
                    $unwind: {
                        path: '$products',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'products.productId',
                        foreignField: '_id',
                        as: 'products.productsdetails' //push the product into the same array of product invoice
                    }
                },
                {
                    $unwind: {
                        path: '$products.productsdetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        $and: [{ "products.productsdetails.productStatus": 2 },
                        { "products.productsdetails.sale": 2 }]
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'storeId',
                        foreignField: 'storeId',
                        as: 'managerdetails'
                    }
                },
                {
                    $unwind: {
                        path: '$managerdetails',
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
                    "$group": {
                        "_id": "$_id",
                        "invoiceNo": { "$first": "$invoiceNo" },
                        "billDate": { "$first": "$billDate" },
                        "total": { "$first": "$total" },
                        "subtotal": { "$first": "$subTotal" },
                        "discount": { "$first": "$discount" },
                        'taxNumber': { '$first': '$taxNumber' },
                        'invoiceAddress': { '$first': '$invoiceAddress' },
                        "discountAmount": { "$first": "$discountAmount" },
                        'priceType': { '$first': '$priceType' },
                        "tax": { "$first": "$tax" },
                        "taxAmount": { "$first": "$taxAmount" },
                        "products": {
                            "$push": {
                                // quantity: "$products.quantity",
                                // totalPrice: "$products.totalPrice",
                                productname: "$products.productsdetails.name",
                                productprice: "$products.price",
                                serialNo: "$products.productsdetails.serialNo"
                            }
                        }, // product with productdetails array
                        data: {
                            $addToSet: {
                                managername: '$managerdetails.managerName',
                                managerdetail: '$managerdetails.profilePhoto',
                                storename: '$storedetails.name',
                                storelocation: "$storedetails.location",
                                storecountrycode: "$storedetails.countryCode",
                                storenumber: "$storedetails.number",
                                customeremail: '$customerdetails.email',
                                customeroccupation: "$customerdetails.occupation",
                                customeraddress: "$customerdetails.address",
                                customercountry: "$customerdetails.country",
                                customerprofileImg: "$customerdetails.profileImg",
                                customercountryCode: "$customerdetails.countryCode",
                                customermobileNumber: "$customerdetails.mobileNumber",
                                customername: "$customerdetails.name"
                            }
                        }
                    }
                },
            ]);

            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send
            });

        }
        catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }

    //Delete invoice
    async deleteinvoice(req, res) {
        try {

            if (req.params.invoiceId === undefined) {
                return res.status(403).json({
                    "status": 403,
                    "message": 'invoice id is requried'
                });
            }

            let invoiceId = req.params.invoiceId;

            await Invoice.findOneAndUpdate({ "_id": invoiceId }, {
                $set: {
                    invoiceDelete: 2
                }
            });

            return res.status(200).json({
                'status': 200,
                'message': "invoice has been deleted", // data that needs to be send
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }

    //Global search
    async globalsearch(req, res) {
        try {

            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : '' // getting the search value

            if (searchKey != '') {

                let data = await User.aggregate([
                    {
                        $match: {
                            accountStatus: 1
                        }
                    },
                    {
                        $lookup: {
                            from: "customers",
                            localField: "_id",
                            foreignField: "userId",
                            as: "customerdetails"
                        }
                    },
                    {
                        $lookup: {
                            from: "products",
                            localField: "_id",
                            foreignField: "userId",
                            as: "productsdetails"
                        }
                    },
                    {
                        $lookup: {
                            from: "invoices",
                            localField: "_id",
                            foreignField: "saledBy",
                            as: "invoicesdetails"
                        }
                    },

                    {
                        $group: {
                            _id: "$_id",
                            data: {
                                $push: {
                                    "customer": "$customerdetails",
                                    "product": "$productsdetails",
                                    "invoice": "$invoicesdetails"
                                }
                            }
                        }
                    },
                    {
                        $unwind: {
                            path: '$data',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: { //unwind the array inside arrary of data
                            path: '$data.customer',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: '$data.product',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: '$data.invoice',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: { // group by addToSet to particular array of  name 
                            _id: null,
                            "customers": {
                                "$addToSet": {
                                    _id: "$data.customer._id",
                                    type: "customer",
                                    name: "$data.customer.name", //customerName
                                    // customerEmail: "$data.customer.email",
                                    // customerNumber: '$data.customer.mobileNumber',
                                    customerStatus: '$data.customer.customerStatus'
                                }
                            },
                            "product": {
                                "$addToSet": {
                                    _id: "$data.product._id",
                                    name: "$data.product.name", //productName
                                    type: "product",
                                    productserialNo: "$data.product.serialNo", //productserialNo
                                    productStatus: '$data.product.productStatus'
                                }
                            },
                            "invoice": {
                                "$addToSet": {
                                    type: "invoice",
                                    _id: "$data.invoice._id",
                                    name: "$data.invoice.invoiceNo", //invoice
                                    invoiceStatus: '$data.invoice.invoiceDelete'
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            value: { $concatArrays: ["$customers", "$invoice", "$product"] }
                        }
                    },
                    {
                        $unwind: "$value"
                    },
                    {
                        $match: {
                            "$or": [
                                { "value.customerStatus": 1 },
                                { "value.productStatus": 1 },
                                { "value.invoiceStatus": 1 }
                            ]
                        }
                    },
                    {
                        $match: {
                            "$or": [
                                // { "value.name": { '$regex': searchKey, $options: 'ixs' } },
                                // { "value.name": { '$regex': searchKey, $options: 'ixs' } },
                                { "value.name": { '$regex': searchKey, $options: 'ixs' } },
                                { "value.name": { '$regex': searchKey, $options: 'ixs' } },
                                { "value.name": { '$regex': searchKey, $options: 'ixs' } },
                                //{ "value.name": { '$regex': searchKey, $options: 'ixs' } }
                            ]
                        }
                    }
                ]);

                return res.status(201).json({
                    "status": 201,
                    "data": data
                });
            }
        } catch (error) {
            return res.status(500).json({
                "status": false,
                "message": error
            });
        }
    }

}
invoiceAuth = new invoiceAuth();
module.exports = invoiceAuth;



