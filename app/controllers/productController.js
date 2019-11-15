const Product = require('../models/product'),
    Stock = require('../models/stock'),
    Store = require('../models/stores'),
    Joi = require('@hapi/joi'),
    mongoose = require('mongoose'),
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    excelToJson = require('convert-excel-to-json');



// Admin Authentication
class productAuth {


    // Add product
    async addproduct(req, res) {
        try {
            const bulkdata = [];

            //util.promisify();

            if (req.file)
                var productImage = req.file.filename;

            let schema = Joi.object().keys({
                //product collection
                name: Joi.string().trim().label('name').required(),
                detail: Joi.string().trim().label('detail').allow(''),
                serialNo: Joi.string().trim().alphanum().label('serialNo').required(),
                category: Joi.string().trim().label('catgory').required(),
                location: Joi.string().trim().label('product location').required(), // product location
                //retail: Joi.object().pattern(/.*/, [Joi.number()]).required(),
                //wholesale: Joi.object().pattern(/.*/, [Joi.number()]).required(),
                retailrupees: Joi.number().label('retailrupees').required(),
                retaildollor: Joi.number().label('retaildollor').required(),
                retaildinar: Joi.number().label('retail dinar').required(),
                retailpounds: Joi.number().label('retail pound').required(),
                retaileuro: Joi.number().label('retail euro').required(),
                wholerupees: Joi.number().label('wholesale rupees').required(),
                wholedollor: Joi.number().label('wholesale dollor').required(),
                wholedinar: Joi.number().label('wholesale dinar').required(),
                wholepounds: Joi.number().label('wholesale pound').required(),
                wholeeuro: Joi.number().label('whholesale euro').required(),
                stone: Joi.string().trim().label('stone').required(),
                gold: Joi.string().trim().label('gold').required(),
                size: Joi.string().trim().label('size').allow(''),
                gross: Joi.string().trim().label('gross').required(),
                length: Joi.string().trim().label('length').required(),
                width: Joi.string().trim().label('width').required(),
                height: Joi.string().trim().label('height').required(),
            });

            let { value, error } = Joi.validate(req.body, schema, {
                abortEarly: true
            });

            if (error) {
                console.log("error-->", error)
                return res.status(500).json({
                    "status": 500,
                    "message": error.map(error => error.message)
                });
            }


            let store = await Store.findOne({
                "location": value.location.toLowerCase(),
                "storeStatus": 1
            }).lean();


            if (!store) {
                return res.status(422).json({
                    "status": 422,
                    "message": "No store is exist in this location"
                });
            }


            let productData = await Product.findOne({
                "serialNo": value.serialNo,
                "productStatus": 1
            });


            if (productData !== null && productData.productStatus == 2 && productData.sale == 2 ||
                productData !== null && productData.productStatus == 1 && productData.sale == 2) {

                await Product.findByIdAndUpdate(productData._id, {
                    productStatus: 1,
                    sale: 1,
                    name: value.name.toLowerCase(),
                    detail: value.detail,
                    location: value.location.toLowerCase(),
                    category: value.category.toLowerCase(),
                    serialNo: value.serialNo,
                    retail: {
                        rupees: value.retailrupees,
                        dollor: value.retaildollor,
                        dinar: value.retaildinar,
                        pounds: value.retailpounds,
                        euro: value.retaileuro
                    },
                    wholesale: {
                        rupees: value.wholerupees,
                        dollor: value.wholedollor,
                        dinar: value.wholedinar,
                        pounds: value.wholepounds,
                        euro: value.wholeeuro
                    },
                    weight: {
                        stone: value.stone,
                        gold: value.gold,
                        gross: value.gross
                    },
                    size: value.size,
                    measurement: {
                        length: value.length,
                        width: value.width,
                        height: value.height
                    },
                    storeId: store._id,
                    userId: req.user._id,
                    image: productImage
                });

                return res.status(201).json({
                    "status": 201,
                    message: "product is added created successfully"
                });
            }


            else if (productData !== null && productData.productStatus == 1 && productData.sale == 1) {
                return res.status(422).json({
                    "status": 422,
                    message: "product Serial Number is already exist"
                });
            }

            else {
                let product = new Product({
                    name: value.name.toLowerCase(),
                    detail: value.detail,
                    category: value.category.toLowerCase(),
                    location: value.location.toLowerCase(),
                    serialNo: value.serialNo,
                    retail: {
                        rupees: value.retailrupees,
                        dollor: value.retaildollor,
                        dinar: value.retaildinar,
                        pounds: value.retailpounds,
                        euro: value.retaileuro
                    },
                    wholesale: {
                        rupees: value.wholerupees,
                        dollor: value.wholedollor,
                        dinar: value.wholedinar,
                        pounds: value.wholepounds,
                        euro: value.wholeeuro
                    },
                    weight: {
                        stone: value.stone,
                        gold: value.gold,
                        gross: value.gross
                    },
                    measurement: {
                        length: value.length,
                        width: value.width,
                        height: value.height
                    },
                    size: value.size,
                    storeId: store._id,
                    userId: req.user._id,
                    image: productImage
                });

                await product.save();

                return res.status(201).json({
                    "status": 201,
                    "message": "product is created successfully"
                });
            }


        } catch (error) {
            console.log('err-->', error);
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }

    // getall products by category
    async getall(req, res) {

        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let data = [];
            let total = [];
            let skip = size * (pageNo - 1);
            let limit = size;

            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : '' // getting the search value


            searchQuery = {
                ...searchQuery,
                ...{

                    'category': {
                        $regex: searchKey,
                        $options: 'is'
                    }

                }
            }

            if (searchKey === '') {
                data = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ "productStatus": 1 }, { "sale": 1 }]
                        }
                    },
                    {
                        $sort: {
                            "createdAt": 1
                        }
                    },
                    {
                        $group: {
                            _id: { category: "$category" },// location: "$location"

                        }
                    },

                    {
                        "$skip": skip
                    }, {
                        "$limit": limit
                    }
                ]);

                total = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ "productStatus": 1 }, { "sale": 1 }]
                        }
                    },
                    {
                        $group: {
                            _id: { category: "$category" },
                        }
                    },

                    {
                        $sort: {
                            "createdAt": -1
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
            }
            else {


                data = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ "productStatus": 1 }, { "sale": 1 }],
                            ...searchQuery
                        }
                    },
                    {
                        $group: {
                            _id: { category: "$category" }

                        }
                    },
                    {
                        $sort: {
                            "createdAt": -1
                        }
                    },
                    // {
                    //     "$skip": skip
                    // }, 
                    {
                        "$limit": limit
                    }
                ]);

                total = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ "productStatus": 1 }, { "sale": 1 }],
                            ...searchQuery
                        }
                    },
                    {
                        $group: {
                            _id: { category: "$category" }
                        }
                    },

                    {
                        $sort: {
                            "createdAt": -1
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

            }

            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send
                'total': total, // total data available
                'skip': skip, // skip numbers
                'limit': limit // limit 
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }


    // Get proudct according to the category
    async getcategory(req, res) {
        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let data = [];
            let total = [];
            let skip = size * (pageNo - 1);
            let limit = size;

            if (req.query.category === undefined || req.query.category === '') {
                return res.status(422).json({
                    "status": 422,
                    "message": "category is requried"
                });
            }

            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase().trim() : '' // getting the search value
            let category = req.query.category.toLowerCase(); // product category
            //let name = req.query.name.toLowerCase();


            //product name
            searchQuery = {
                ...searchQuery,
                ...{
                    $or: [{
                        'category': {
                            $regex: searchKey,
                            $options: 'si'
                        }

                    }, {
                        'serialNo': {
                            $regex: searchKey,
                            $options: 'si'
                        }
                    }, {
                        'name': {
                            $regex: searchKey,
                            $options: 'is'
                        }
                    }]
                }
            }

            if (searchKey === '') {
                data = await Product.aggregate([{
                    $match: {
                        "category": category,
                        $and: [{ "productStatus": 1 }, { "sale": 1 }]
                    }
                }, {
                    $sort: {
                        //"productdetails.serialNo": { $meta: "textScore" },
                        "serialNo": -1
                    }
                }, {
                    $group: {
                        _id: {
                            category: "$category", location: "$location", name: "$name"
                        },
                        "category": { "$first": "$category" },
                        "location": { "$first": "$location" },
                        "name": { "$first": "$name" },
                        data: {
                            $push: {
                                serialNo: "$serialNo",

                            }
                        }
                    }
                }, {
                    "$skip": skip
                }, {
                    "$limit": limit
                },
                ]);

                total = await Product.aggregate([{
                    $match: {
                        "category": category,
                        $and: [{ "productStatus": 1 }, { "sale": 1 }]
                    }
                },
                {
                    $sort: {
                        //"productdetails.serialNo": { $meta: "textScore" },
                        "serialNo": -1
                    }
                }, {
                    $group: {
                        _id: {
                            category: "$category", location: "$location", name: "$name"
                        },
                        "category": { "$first": "$category" },
                        "location": { "$first": "$location" },
                        "name": { "$first": "$name" },
                        data: {
                            $push: {
                                serialNo: "$serialNo"
                            }
                        }
                    }
                }, {
                    $count: 'sum'
                },
                ]);
                // calculating the total number of product 
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;
            }
            else {
                data = await Product.aggregate([{
                    $match: {
                        "category": category,
                        $and: [{ "productStatus": 1 }, { "sale": 1 }],
                        ...searchQuery
                    }
                },
                {
                    $sort: {
                        //"productdetails.serialNo": { $meta: "textScore" },
                        "serialNo": -1
                    }
                }, {
                    $group: {
                        _id: {
                            category: "$category", location: "$location", name: "$name"
                        },
                        "category": { "$first": "$category" },
                        "location": { "$first": "$location" },
                        "name": { "$first": "$name" },
                        data: {
                            $push: {
                                serialNo: "$serialNo"
                            }
                        }
                    }
                }, {
                    "$limit": limit
                }, {
                    $project: {
                        _id: 0,
                        location: 1,
                        category: 1,
                        name: 1,
                        data: 1
                    }
                }]);

                total = await Product.aggregate([
                    {
                        $match: {
                            "category": category,
                            $and: [{ "productStatus": 1 }, { "sale": 1 }],
                            ...searchQuery
                        }
                    }, {
                        $sort: {
                            //"productdetails.serialNo": { $meta: "textScore" },
                            "serialNo": -1
                        }
                    },
                    {
                        $group: {
                            _id: {
                                category: "$category", location: "$location", name: "$name"
                            },
                            "category": { "$first": "$category" },
                            "location": { "$first": "$location" },
                            "name": { "$first": "$name" },
                            data: {
                                $push: {
                                    serialNo: "$serialNo"
                                }
                            }
                        }
                    },
                    {
                        "$limit": limit
                    },
                    {
                        $project: {
                            _id: 0,
                            category: 1,
                            location: 1,
                            name: 1,
                            data: 1
                        }
                    },
                    {
                        $count: 'sum'
                    },
                ]);

                // calculating the total number of product 
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;

            }

            if (data[0] === undefined) {
                return res.status(422).json({
                    'status': 422,
                    'message': "No data"
                });
            }

            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send
                'total': total, // total data available
                'skip': skip, // skip numbers
                'limit': limit // limit 
            });
        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }



    //View the product list by category and location
    async productlist(req, res) {
        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let data = [];
            let total = [];
            let skip = size * (pageNo - 1);
            let limit = size;

            if (req.query.category === undefined || req.query.category === '') {
                return res.status(422).json({
                    "status": 422,
                    "message": "category is requried"
                });
            }

            // getting the search query
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase() : '' // getting the search value
            let category = req.query.category.toLowerCase(); // product category
            let location = req.query.location.toLowerCase();
            let name = req.query.name.toLowerCase();


            //product name
            searchQuery = {
                ...searchQuery,
                ...{
                    $or: [{
                        'category': {
                            $regex: searchKey,
                            $options: 'si'
                        }

                    }, {
                        'serialNo': {
                            $regex: searchKey,
                            $options: 'si'
                        }
                    }, {
                        'currentLocation': {
                            $regex: searchKey,
                            $options: 'si'
                        }
                    }, {
                        'status': {
                            $regex: searchKey,
                            $options: 'si'
                        }
                    }]
                }
            }

            if (searchKey == "") {

                data = await Product.aggregate([
                    {
                        $match: {
                            $and: [{
                                "category": category,
                            }, {
                                "location": location,
                            }, {
                                "name": name,
                            }, { "productStatus": 1 }, { "sale": 1 }]
                        }
                    },
                    {
                        $sort: {
                            "createdAt": -1
                        }
                    },
                    {
                        "$skip": skip
                    }, {
                        "$limit": limit
                    }, {
                        $project: {
                            productStatus: 0,
                            userId: 0,
                            createdAt: 0,
                            updatedAt: 0,
                            __v: 0,
                        }
                    }
                ]);

                total = await Product.aggregate([
                    {
                        $match: {
                            $and: [{
                                "category": category,
                            }, {
                                "location": location,
                            }, {
                                "name": name,
                            }, { "productStatus": 1 }, { "sale": 1 }]
                        }
                    },
                    {
                        $sort: {
                            "createdAt": -1
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
            }
            else {
                data = await Product.aggregate([
                    {
                        $match: {
                            $and: [{
                                "category": category,
                            }, {
                                "location": location,
                            }, {
                                "name": name,
                            }, { "productStatus": 1 }, { "sale": 1 }],
                            ...searchQuery

                        }
                    },

                    {
                        $sort: {
                            "createdAt": -1
                        }
                    },
                    {
                        "$limit": limit
                    },
                    {
                        $project: {
                            productStatus: 0,
                            userId: 0,
                            createdAt: 0,
                            updatedAt: 0,
                            __v: 0,
                        }
                    }
                ]);

                total = await Product.aggregate([
                    {
                        $match: {
                            $and: [{
                                "category": category,
                            }, {
                                "location": location,
                            }, {
                                "name": name,
                            }, { "productStatus": 1 }, { "sale": 1 }],
                            ...searchQuery

                        }
                    },
                    {
                        $sort: {
                            "createdAt": -1
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
            }


            if (data[0] === undefined) {
                return res.status(422).json({
                    'status': 422,
                    'message': "No data"
                })
            }

            data.map((val) => {
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
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }

    // view the product
    async editproduct(req, res) {

        try {

            if (req.params.productId === undefined) {
                return res.status(422).json({
                    "status": 422,
                    "message": 'product Id requried'
                });
            }

            let id = req.params.productId;

            let data = await Product.aggregate([
                {
                    "$match": {
                        "_id": mongoose.Types.ObjectId(id)
                    }
                }
            ]);

            if (data[0].image != undefined && data[0].image != "")
                data[0].image = process.env.ImageUrl + 'product_img/' + data[0].image;

            return res.status(200).json({
                "status": 200,
                "data": data
            });
        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }

    //change the product current location and status
    async updatelocation(req, res) {

        try {

            if (req.query.productId === undefined || req.query.productId === '') {
                return res.status(422).json({
                    "status": 422,
                    "message": "product Id is requried"
                });
            }

            let productId = req.query.productId;
            let data = {};

            if (req.query.currentLocation) {
                data = {
                    currentLocation: req.query.currentLocation.toLowerCase().trim()
                }
            }
            if (req.query.status) {
                data = {
                    status: req.query.status.toLowerCase().trim()
                }
            }

            if (req.query.stoneDescription) {
                data = {
                    stoneDescription: req.query.stoneDescription
                }
            }

            if (req.query.currentLocation && req.query.status) {
                data = {
                    currentLocation: req.query.currentLocation.toLowerCase().trim(),
                    status: req.query.status.toLowerCase().trim()
                }
            }


            await Product.findOneAndUpdate({ _id: productId }, {
                ...data

            });

            return res.status(201).json({
                "status": 201,
                "message": "product is changed successfully"
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }


    // update product
    async updateproduct(req, res) {

        try {

            //product id
            if (req.params.productId === undefined) {
                return res.status(422).json({
                    "status": 422,
                    "message": 'product Id requried'
                });
            }
            let storeId = {};

            let schema = Joi.object().keys({
                //product collection
                name: Joi.string().trim().label('name'),
                detail: Joi.string().trim().label('detail').allow(''),
                serialNo: Joi.string().trim().alphanum().label('serialNo'),
                category: Joi.string().trim().label('catgory'),
                //retail: Joi.object().pattern(/.*/, [Joi.number()]).required(),
                //wholesale: Joi.object().pattern(/.*/, [Joi.number()]).required(),
                location: Joi.string().trim().label('location').required(),
                retailrupees: Joi.number().label('retail rupees'),
                retaildollor: Joi.number().label('retail dollor'),
                retaildinar: Joi.number().label('retail dinar').required(),
                retailpounds: Joi.number().label('retail pound').required(),
                retaileuro: Joi.number().label('retail euro').required(),
                wholerupees: Joi.number().label('whole sale rupees'),
                wholedollor: Joi.number().label('wholesale dollor'),
                wholedinar: Joi.number().label('wholesale dinar').required(),
                wholepounds: Joi.number().label('wholesale pound').required(),
                wholeeuro: Joi.number().label('wholesale euro').required(),
                size: Joi.string().trim().label('size').allow(''),
                stone: Joi.string().trim().label('stone'),
                gold: Joi.string().trim().label('gold'),
                gross: Joi.string().trim().label('gross'),
                length: Joi.string().trim().label('length'),
                width: Joi.string().trim().label('width'),
                height: Joi.string().trim().label('height'),
                currentLocation: Joi.string().trim().label('currentlocation'),
                status: Joi.string().trim().label('status of product').allow('')
            });

            let { value, error } = Joi.validate(req.body, schema, {
                abortEarly: false
            });

            if (error)
                return res.status(500).json({
                    "status": "validation error",
                    "message": error
                });

            //Check location already exist
            let store = await Store.findOne({
                "location": value.location.toLowerCase()
            }).lean();

            if (!store) {
                return res.status(422).json({
                    "status": 422,
                    "message": "No store is exist in this location " + value.location
                });
            }

            if (storeId)
                storeId = {
                    storeId: store._id
                }

            //Check  product serialNo is already exist
            let product = await Product.findOne({
                '_id': { $nin: req.params.productId },
                "serialNo": value.serialNo,
            }).lean();

            if (product !== null && product.productStatus == 1 && product.sale == 1) {

                return res.status(422).json({
                    "status": 422,
                    "serialNo": product.serialNo,
                    "message": "product already exist with this serialNo try to change new",
                    //"message": "product already exist with this serialNo try to change new"
                });
            }

            let data = {
                name: value.name.toLowerCase(),
                detail: value.detail,
                category: value.category.toLowerCase(),
                serialNo: value.serialNo,
                location: value.location.toLowerCase(),
                retail: {
                    rupees: value.retailrupees,
                    dollor: value.retaildollor,
                    dinar: value.retaildinar,
                    pounds: value.retailpounds,
                    euro: value.retaileuro
                },
                wholesale: {
                    rupees: value.wholerupees,
                    dollor: value.wholedollor,
                    dinar: value.wholedinar,
                    pounds: value.wholepounds,
                    euro: value.wholeeuro
                },
                weight: {
                    stone: value.stone,
                    gold: value.gold,
                    gross: value.gross
                },
                size: value.size,
                measurement: {
                    length: value.length,
                    width: value.width,
                    height: value.height
                }
            }

            if (value.currentLocation != '' && value.currentLocation != undefined) {
                data = {
                    currentLocation: value.currentLocation
                }
            }

            if (value.status != '' && value.status != undefined) {
                data = {
                    status: value.status
                }
            }

            let productId = req.params.productId;

            // to get image name
            if (req.file) {
                var files = {};
                let imagename = req.file.filename;
                files = {
                    image: imagename
                }
            }

            // product update
            let productData = await Product.findOneAndUpdate({
                "_id": productId
            }, {
                ...data,
                ...storeId,
                ...files
            }, { new: true });

            productData.image = process.env.ImageUrl + 'product_img/' + productData.image;

            return res.status(201).json({
                "status": 201,
                "message": "updated successfully"
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }

    // Delete product
    async deleteproduct(req, res) {
        try {

            let productId = req.params.productId;

            if (productId === undefined && productId != '') {
                return res.status(422).json({
                    "status": 422,
                    "message": 'storeId requried'
                });
            }


            await Product.findOneAndUpdate({
                "_id": productId
            }, {
                $set: {
                    productStatus: 2,
                    sale: 2
                }
            });

            // let stock = await Stock.aggregate([
            //     {
            //         $match: {
            //             "productId": mongoose.Types.ObjectId(productId)
            //         }
            //     }
            // ]);
            // // to delete multiple stock of product
            // for (const docs of stock) {
            //     let id = docs.productId;
            //     await Stock.update({ productId: id }, { $set: { Deleted: 2 } }, { multi: true });
            // }

            return res.status(200).json({
                "status": 200,
                "message": "Product Has Been Deleted"
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }

    //product bulk upload using excel file
    async exceltojson(req, res) {

        try {
            //If file is empty
            if (!req.file) {
                return res.status(403).json({
                    "status": false,
                    "message": "please select file excel"
                });
            }

            const filename = req.file;
            const result = excelToJson({
                source: fs.readFileSync(filename.path) // fs.readFileSync return a Buffer
            });

            //slice and get only Details
            let data = result.Sheet1;
            let product = data.slice(1); //upload product as Array

            //Check the length of excel
            if (product.length === 0) {
                return res.status(422).json({
                    "status": 422,
                    "message": "Excel is empty can't import"
                });
            }

            //Check wheather the product name,serialNo & category  is exist or not

            //Filter the empty value and return only the array which as value
            const productbefore = product.filter(Boolean);

            //Define value
            let productname = 0;
            let serialNoafter = 0;
            let categoryafter = 0;
            let locationafter = 0;

            //Add the value for the respective fields
            for (const docs of product) {
                let name = docs.A;
                let serial = docs.C;
                let category = docs.D;
                let location = docs.U;
                if (name != undefined && name != '')
                    productname++;
                if (serial != undefined && serial != '')
                    serialNoafter++;
                if (category != undefined && category != '')
                    categoryafter++;
                if (location != undefined && location != '')
                    locationafter++;
            }

            //Getting the all product name
            // let productresult = await productafter.filter(Boolean);
            //compare both after and before count
            if (productname < productbefore.length) {
                return res.status(422).json({
                    "status": 422,
                    "message": "product name is requried"
                });
            }

            //Getting the all serail number & compare count
            if (serialNoafter < productbefore.length) {
                return res.status(422).json({
                    "status": 422,
                    "message": "serial Number is requried"
                });
            }


            //compare count  
            if (categoryafter < productbefore.length) {
                return res.status(422).json({
                    "status": 422,
                    "message": "category is requried"
                });
            }

            //let locationresult = await locationafter.filter(Boolean);

            if (locationafter < productbefore.length) {
                return res.status(422).json({
                    "status": 422,
                    "message": "location is requried"
                });
            }

            // loop the product to add
            for (let docs of product) {

                let loopCount = 0;
                let store = await Store.findOne({
                    "location": docs.U.toLowerCase()
                }).lean();

                if (!store) {
                    return res.status(422).json({
                        "status": 422,
                        "message": "No store is exist in this location for this serialNo " + docs.C
                    });
                }

                let productData = await Product.findOne({
                    "serialNo": docs.C,
                }).lean();

                // if product already exist but deleted
                if (productData !== null && productData.productStatus == 2 && productData.sale == 2 ||
                    productData !== null && productData.productStatus == 1 && productData.sale == 2) {
                    await Product.findByIdAndUpdate(productData._id, {
                        sale: 1,
                        productStatus: 1,
                        name: docs.A.toLowerCase(),
                        detail: docs.B,
                        serialNo: docs.C,
                        category: docs.D.toLowerCase(),
                        "retail.rupees": parseFloat(docs.E),
                        "retail.dollor": parseFloat(docs.F),
                        "retail.pounds": parseFloat(docs.G),
                        "retail.dinar": parseFloat(docs.H),
                        "retail.euro": parseFloat(docs.I),
                        "wholesale.rupees": parseFloat(docs.J),
                        "wholesale.dollor": parseFloat(docs.K),
                        "wholesale.pounds": parseFloat(docs.L),
                        "wholesale.dinar": parseFloat(docs.M),
                        "wholesale.euro": parseFloat(docs.N),
                        "measurement.length": docs.O,
                        "measurement.width": docs.P,
                        "measurement.height": docs.Q,
                        "weight.stone": docs.R,
                        "weight.gold": docs.S,
                        "weight.gross": docs.T,
                        "location": docs.U.toLowerCase(),
                        'stoneDescription': docs.V,
                        "size": docs.W,
                        "storeId": store._id,
                        userId: req.user._id,
                        image: 'product.png'
                    });

                    loopCount++;
                    if (product.length == loopCount) {
                        return res.status(201).json({
                            "status": 201,
                            message: "product is added  successfully"
                        });
                    }
                }

                else if (productData !== null && productData.productStatus == 1 && productData.sale == 1) {

                    return res.status(422).json({
                        "status": 422,
                        "serialNo": productData.serialNo,
                        "message": "Change the serial number of the product name " + docs.A + " which category is " + docs.D,
                        //"message": "product already exist with this serialNo try to change new"
                    });
                }

                else {

                    let value = new Product({
                        name: docs.A.toLowerCase(),
                        detail: docs.B,
                        serialNo: docs.C,
                        category: docs.D.toLowerCase(),
                        "retail.rupees": parseFloat(docs.E),
                        "retail.dollor": parseFloat(docs.F),
                        "retail.pounds": parseFloat(docs.G),
                        "retail.dinar": parseFloat(docs.H),
                        "retail.euro": parseFloat(docs.I),
                        "wholesale.rupees": parseFloat(docs.J),
                        "wholesale.dollor": parseFloat(docs.K),
                        "wholesale.pounds": parseFloat(docs.L),
                        "wholesale.dinar": parseFloat(docs.M),
                        "wholesale.euro": parseFloat(docs.N),
                        "measurement.length": docs.O,
                        "measurement.width": docs.P,
                        "measurement.height": docs.Q,
                        "weight.stone": docs.R,
                        "weight.gold": docs.S,
                        "weight.gross": docs.T,
                        "location": docs.U.toLowerCase(),
                        'stoneDescription': docs.V,
                        "size": docs.W,
                        "storeId": store._id,
                        image: 'product.png',
                        userId: req.user._id,
                        productStatus: 1,
                        sale: 1
                    });

                    await value.save();

                    loopCount++;

                    if (product.length == loopCount) {
                        return res.status(201).json({
                            "status": 201,
                            "message": "product is added  successfully"
                        });
                    }
                }
            }

            return res.status(201).json({
                "status": 201,
                "message": "Products uploaded successfully"
            });


        } catch (error) {
            console.log('err-->', error);

            return res.status(500).json({
                "status": 500,
                message: error
            });
        }
    }

    // Download  sample template excel
    async exceldownload(req, res) {

        try {

            let key = process.env.ImageUrl + 'excel/' + 'product.xlsx';

            return res.status(201).json({
                "status": 201,
                "path": key
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }

    }

    //Get all product list and search current location
    async listproduct(req, res) {

        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let skip = size * (pageNo - 1);
            let limit = size;
            let data = [];
            let total = [];
            let searchQuery = {};
            let searchKey = req.query.value !== undefined ? req.query.value.toLowerCase().trim() : '' // getting the search value         

            // product  
            searchQuery = {
                ...searchQuery,
                ...{
                    $or: [{
                        'name': {
                            $regex: searchKey,
                            $options: 'is'
                        }
                    }, {
                        'serialNo': {
                            $regex: searchKey,
                            $options: 'is'
                        }
                    }, {
                        'category': {
                            $regex: searchKey,
                            $options: 'is'
                        }
                    }]
                }
            }

            // if Search Query is Empty
            if (searchKey === '') {
                data = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ productStatus: 1 }, { sale: 1 }]
                        }
                    }, {
                        $sort:
                        {
                            "serialNo": -1
                        }
                    }, {
                        $group: {
                            _id: {
                                category: "$category", location: "$location",
                                name: "$name"
                            },
                            "category": { "$first": "$category" },
                            "location": { "$first": "$location" },
                            "name": { "$first": "$name" },
                            data: {
                                $push: {
                                    serialNo: "$serialNo",
                                }
                            }
                        }
                    }, {
                        "$skip": skip
                    }, {
                        "$limit": limit
                    }, {
                        $project: {
                            _id: 0,
                            category: 1,
                            location: 1,
                            name: 1,
                            data: 1
                        }
                    },

                ]).allowDiskUse(true);

                total = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ productStatus: 1 }, { sale: 1 }]
                        }
                    }, {
                        $sort:
                        {
                            "serialNo": -1
                        }
                    }, {
                        $group: {
                            _id: {
                                category: "$category", location: "$location",
                                name: "$name"
                            },
                            "category": { "$first": "$category" },
                            "location": { "$first": "$location" },
                            "name": { "$first": "$name" },
                            data: {
                                $push: {
                                    serialNo: "$serialNo",
                                }
                            }
                        }
                    }, {
                        $count: 'sum'
                    }
                ]).allowDiskUse(true);

                // calculating the total number of customer for given scenario
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;
            }


            else {

                data = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ productStatus: 1 }, { sale: 1 }],
                            ...searchQuery
                        }
                    }, {
                        $sort:
                        {
                            "serialNo": -1
                        }
                    }, {
                        $group: {
                            _id: {
                                category: "$category", location: "$location", name: "$name"
                            },
                            "category": { "$first": "$category" },
                            "location": { "$first": "$location" },
                            "name": { "$first": "$name" },
                            data: {
                                $push: {
                                    serialNo: "$serialNo"
                                }
                            }
                        }
                    }, {
                        $project: {
                            _id: 0,
                            category: 1,
                            location: 1,
                            name: 1,
                            data: 1
                        }
                    }, {
                        "$limit": limit
                    },

                ]).allowDiskUse(true);

                total = await Product.aggregate([
                    {
                        $match: {
                            $and: [{ productStatus: 1 }, { sale: 1 }],
                            ...searchQuery

                        }
                    }, {
                        $sort:
                        {
                            "serialNo": -1
                        }
                    }, {
                        $group: {
                            _id: {
                                category: "$category", location: "$location", name: "$name"
                            },
                            "category": { "$first": "$category" },
                            "location": { "$first": "$location" },
                            "name": { "$first": "$name" },
                            data: {
                                $push: {
                                    serialNo: "$serialNo"
                                }
                            }
                        }
                    }, {
                        $count: 'sum'
                    }
                ]).allowDiskUse(true);

                // calculating the total number of customer for given scenario
                if (total[0] !== undefined)
                    total = total[0].sum;
                else
                    total = 0;

            }
            return res.status(200).json({
                'status': 200,
                'data': data, // data that needs to be send
                'total': total, // total data available
                'skip': skip, // skip numbers
                'limit': limit // limit 
            });


        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }

    // view product in current location & status change page
    async viewproduct(req, res) {
        try {
            let productId = req.params.productId;

            if (productId === undefined && productId === '') {
                return res.status(422).json({
                    "status": 422,
                    "message": 'product Id requried'
                });
            }

            let data = await Product.findOne({ _id: productId }).lean();

            return res.status(200).json({
                "status": true,
                "data": data
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }


}
productAuth = new productAuth();
module.exports = productAuth;

