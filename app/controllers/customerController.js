const Customer = require('../models/customers'),
    BaseJoi = require('@hapi/joi'),
    Extension = require('@hapi/joi-date'),
    Joi = BaseJoi.extend(Extension),
    Invoice = require('../models/invoices'),
    Country = require('../models/countries'),
    State = require('../models/states'),
    City = require('../models/cities'),
    jwt = require('jsonwebtoken'),
    mongoose = require('mongoose');


// Admin Authentication
class customerAuth {

    // Add customer details
    async addcustomer(req, res) {
        try {

            //Validation
            let schema = Joi.object().keys({
                //customer collection
                email: Joi.string().email().trim().label('email').required(),
                name: Joi.string().trim().label('customername').required(),
                mobileNumber: Joi.string().trim().label('number').allow(''),
                country: Joi.string().trim().label('country').required(),
                state: Joi.string().trim().label('state').required(),
                city: Joi.string().trim().label('city').required(),
                countryCode: Joi.string().label('countrycode').allow(''),
                address: Joi.string().trim().label('address').required(),
                dob: Joi.date().format('YYYY-MM-DD').raw().label('DOB').required(),
                anniversary: Joi.date().format('YYYY-MM-DD').label('anniversary').allow(''),
                // anniversary: Joi.date().raw().format('DD/MM/YYYY').label('anniversary'),
                occupation: Joi.string().trim().label('occupation').required(),
                brandAbout: Joi.string().trim().label('brandAbout')
            });

            let { value, error } = Joi.validate(req.body, schema, {
                abortEarly: false
            });


            if (error) {
                return res.status(500).json({
                    "status": 0,
                    message: error
                });
            }

            //Object to Pass
            let dataToSet = {
                customerStatus: 1,
                email: value.email,
                name: value.name,
                mobileNumber: value.mobileNumber,
                countryCode: value.countryCode,
                country: value.country.toLowerCase(),
                address: value.address,
                dob: new Date(value.dob),
                occupation: value.occupation,
                brandAbout: value.brandAbout,
                state: value.state,
                city: value.city,
                userId: req.user._id,
                anniversary: ""
            }

            // anniversay date exist
            if (value.anniversary !== '' && value.anniversary !== undefined) {
                dataToSet = {
                    ...dataToSet,
                    ...{
                        anniversary: new Date(value.anniversary),
                    }
                }
            }

            var customerData = await Customer.findOne({
                "email": dataToSet.email,
            }).lean();

            // customer exist and deleted check and update
            if (customerData !== null && customerData.customerStatus === 3) {

                let data = await Customer.findOneAndUpdate({ "_id": customerData._id }, {
                    $set: dataToSet
                });

                return res.status(201).json({
                    "status": 201,
                    message: "Customer is created successfully"
                });
            }

            else if (customerData !== null && customerData.customerStatus == 1) {
                return res.status(405).json({
                    "status": 405,
                    message: "customer email is already exist"
                });
            }

            // customer create
            else {
                await new Customer(dataToSet).save();
                return res.status(201).json({
                    "status": 201,
                    "message": "Customer is created successfully"
                });
            }

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }

    // To get all customer list
    async getall(req, res) {

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

            // search email or name or mobilenumber
            searchQuery = {
                ...searchQuery,
                ...{
                    $or: [{
                        'email': {
                            $regex: searchKey,
                            $options: 'ixs'
                        }
                    }, {
                        'name': {
                            $regex: searchKey,
                            $options: 'ixs'
                        }
                    },
                    {
                        'mobileNumber': {
                            $regex: searchKey,
                            $options: 'ixs'
                        }
                    }]
                }
            }

            // if Search Query is Empty
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
                        "$skip": skip
                    }, {
                        "$limit": limit
                    }
                ]).allowDiskUse(true);

                total = await Customer.aggregate([
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
                    // {
                    //     "$skip": skip
                    // }, 
                    {
                        "$limit": limit
                    }
                ]).allowDiskUse(true);



                total = await Customer.aggregate([
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
                        $count: 'sum'
                    }
                ]).allowDiskUse(true);

                // calculating the total number  for the given scenario
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

    //Edit customer
    async editcustomer(req, res) {

        try {

            if (req.params.customId === undefined) {
                return res.status(422).json({
                    "status": 422,
                    "message": 'customer Id requried'
                });
            }

            //user Id
            let id = req.params.customId;

            // pagination
            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let skip = size * (pageNo - 1);
            let limit = size;

            // datas
            let data = [];
            let invoice = [];
            let total = [];

            //To get the invoice
            invoice = await Invoice.aggregate([
                {
                    $match: {
                        customerId: mongoose.Types.ObjectId(id),
                        invoiceDelete: 1
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storeslocation'
                    }
                },
                {
                    $unwind: {
                        path: '$storeslocation',
                        preserveNullAndEmptyArrays: true
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
                        customerId: mongoose.Types.ObjectId(id),
                        invoiceDelete: 1
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storeslocation'
                    }
                },
                {
                    $unwind: {
                        path: '$storeslocation',
                        preserveNullAndEmptyArrays: true
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

            // If invoice is present for that customer
            if (invoice.length >= 1) {
                data = await Customer.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(id),
                            customerStatus: 1
                        }
                    },
                ])
            }
            else {
                data = await Customer.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(id),
                            customerStatus: 1
                        }
                    },
                ])
            }


            return res.status(200).json({
                'status': 200,
                'data': data,
                "invoice": invoice,
                "total": total,
                'skip': skip, // skip numbers
                'limit': limit, // limit 

            });
        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }

    // update customer
    async updatecustomer(req, res) {

        try {

            if (req.params.customId === undefined) {
                return res.status(422).json({
                    "status": 422,
                    "message": 'customer Id requried'
                });
            }


            let id = req.params.customId;
            // req.body.dob = req.body.dob.replace(/[-]/g, '/');
            let schema = Joi.object().keys({
                //customer collection
                email: Joi.string().email().label('email'),
                name: Joi.string().trim().label('customername'),
                mobileNumber: Joi.string().trim().label('number').allow(''),
                country: Joi.string().trim().label('country'),
                state: Joi.string().trim().label('state').required(),
                city: Joi.string().trim().label('city').required(),
                countryCode: Joi.string().label('countrycode'),
                address: Joi.string().trim().label('address'),
                dob: Joi.date().format('YYYY-MM-DD').raw().label('DOB'),
                anniversary: Joi.date().format('YYYY-MM-DD').label('anniversary').allow(''),
                occupation: Joi.string().trim().label('occupation'),
                brandAbout: Joi.string().label('brandAbout')
            });

            let { value, error } = Joi.validate(req.body, schema, {
                abortEarly: false
            });


            if (error) {
                return res.status(500).json({
                    "status": 0,
                    message: error.details.map(d => d.message)
                });
            }

            let storedData = await Customer.findOne({
                "_id": id
            }).lean();

            let dataToSet = {
                email: value.email || storedData.email,
                name: value.name || storedData.name,
                mobileNumber: value.mobileNumber,
                countryCode: value.countryCode,
                country: value.country,
                address: value.address,
                dob: new Date(value.dob),
                occupation: value.occupation,
                brandAbout: value.brandAbout,
                state: value.state,
                city: value.city,
            }

            // anniversay date exist
            if (value.anniversary !== '' && value.anniversary !== undefined) {

                dataToSet = {
                    ...dataToSet,
                    ...{
                        anniversary: new Date(value.anniversary),
                    },
                }
            }


            //update customer
            await Customer.findOneAndUpdate({
                "_id": id
            }, {
                $set: dataToSet
            });

            return res.status(201).json({
                "status": 201,
                "message": "updated successfully"
            });

        } catch (error) {
            return res.status(500).json({
                "status": 500,
                message: error
            });
        }
    }

    //Delete customer
    async deletecustomer(req, res) {

        try {

            if (req.params.customId === undefined) {
                return res.status(422).json({
                    "status": 422,
                    "message": 'customer Id requried'
                });
            }

            let id = req.params.customId;

            await Customer.findOneAndUpdate({
                "_id": id
            }, {
                $set: {
                    customerStatus: 3
                }
            });

            return res.status(200).json({
                "status": 200,
                "message": "Customer Has Been Deleted successfully"
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }


    async country(req, res) {
        try {

            if (req.user.role !== "admin" && req.user.role !== 'Manager')
                return res.status(401).json({
                    "message": 'Not Authorised to access this endpoint'
                });

            let data = await Country.find({});

            return res.status(201).json({
                "status": 201,
                "data": data
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }


    async state(req, res) {
        try {

            let data = await State.find({
                country_id: req.params.stateid
            }).lean();

            return res.status(201).json({
                "status": 201,
                "data": data
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }


    async city(req, res) {
        try {

            let data = await City.find({
                state_id: req.params.cityid
            }).lean();


            return res.status(201).json({
                "status": 201,
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
customerAuth = new customerAuth();
module.exports = customerAuth;