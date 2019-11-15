const User = require('../models/users'),
    Store = require('../models/stores'),
    Stock = require('../models/stock'),
    Product = require('../models/product'),
    Customer = require('../models/customers'),
    Invoice = require('../models/invoices'),
    jwt = require('jsonwebtoken'),
    Joi = require('@hapi/joi'),
    lowerCase = require('lodash.lowercase'),
    bcrypt = require('bcrypt-nodejs'),
    mongoose = require('mongoose');

const {
    generateHash
} = new User();




// Admin Authentication
class userAuth {

    // Admin Login
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
                    "status": 0,
                    "message": error.map(error => error.message)
                });

            let userData = await User.findOneAndUpdate({
                userName: value.userName,
                role: {
                    $eq: "admin" // check super admin
                }
            }, {
                lastlogin: Date.now()
            }, { new: true });

            if (!userData) {
                return res.status(400).json({
                    "status": 400,
                    "message": "Invalid userName"
                });
            }

            else if (!userData.validPassword(value.password)) {
                return res.status(400).json({
                    "status": 400,
                    "message": "Invalid password"
                });
            }

            else if (userData) {
                let data = {
                    userName: userData.userName,
                    id: userData._id,
                    role: userData.role,
                    lastlogin: userData.lastlogin
                }

                let token = jwt.sign(data, process.env.API_KEY, { expiresIn: '24h' });

                return res.status(200).json({
                    "status": 1,
                    "message": "You are logged in Successfully !",
                    "token": "Bearer " + token
                });
            }

        }
        catch (error) {
            return res.status(500).json({
                "status": 500,
                "message": error
            });
        }
    }


    async logout(req, res) {
        try {

            let admin = await User.findOneAndUpdate({
                _id: req.user._id,
            }, {
                lastlogin: null
            }, {
                new: true
            });

            if (admin) {
                return res.status(200).json({
                    "status": 1,
                    "message": "You are logged out Successfully !",
                });
            }

        } catch (error) {
            return res.status(500).json({
                "status": 500,
                "message": error
            });
        }
    }

    //admin change password
    async changepassword(req, res) {
        try {
            let admin = await User.findOne({ _id: req.user._id });

            if (admin) {
                let newpassword = generateHash(req.body.newpassword);
                let currentpassword = admin.password;
                let compare = bcrypt.compareSync(req.body.newpassword, currentpassword);

                let validPassword = admin.validPassword(req.body.oldpassword);

                if (compare === true && validPassword === true) {
                    return res.status(422).json({
                        "status": 422,
                        "message": "Your Password shouldn't be same as your old password"
                    });
                }
                else if (validPassword === false) {
                    return res.status(422).json({
                        "status": 422,
                        "message": "Old password doesn't match"
                    });
                }
                else {
                    await User.findOneAndUpdate({ _id: req.user._id }, { password: newpassword });
                    return res.status(200).json({
                        "status": 200,
                        "message": "Password has changed successfully"
                    });
                }

            }
            else {
                return res.status(500).json({
                    "status": 500,
                    "message": "admin is not found"
                });
            }

        } catch (error) {
            console.log(error);

            return res.status(500).json({
                "status": 500,
                "message": error
            });
        }
    }

    //Create New Store

    async createstore(req, res) {
        try {

            var profilePhoto;
            if (req.file)
                profilePhoto = req.file.filename;
            else
                profilePhoto = '';
            let schema = Joi.object().keys({
                //store collection
                name: Joi.string().trim().label('name').required(),
                countryCode: Joi.string().label('countrycode').allow(''),
                number: Joi.string().trim().label('number').required(),
                //storeLocation: Joi.string().trim().label('country').valid(['unitedKingdom', 'india', 'maldives']).required(),
                location: Joi.string().trim().label('country').required(), //country
                //userName is for store manager signin
                // user collection
                userName: Joi.string().trim().label('userName').required(),
                //  manager name
                managerName: Joi.string().trim().label('managerName').required(),
                password: Joi.string().trim().label('password').allow(''),
                address: Joi.string().trim().required()
            });

            let { value,
                error
            } = Joi.validate(req.body, schema, {
                abortEarly: false
            });


            if (error) {
                return res.status(500).json({
                    "status": 500,
                    "message": error.map(error => error.message)
                    // error.details.map(d => d.message)
                })
            }


            //let value = req.body;

            //let bulkdata = [];error

            let storeData = await Store.findOne({
                //"name": value.name.toLowerCase(),
                "location": value.location.toLowerCase()
            }).lean();

            let managerData = await User.findOne({
                "userName": value.userName
            }).lean();

            if (storeData) {
                return res.status(409).json({
                    "status": 409,
                    message: "Store is already exist with this name in this location"
                });
            }

            if (managerData) {
                return res.status(409).json({
                    "status": 409,
                    message: "Manager UserName already exist"
                });
            }


            else {


                let newStore = new Store({
                    name: value.name.toLowerCase(),
                    userId: req.user._id,
                    number: value.number,
                    address: value.address,
                    location: value.location.toLowerCase() //country
                });

                let store = await newStore.save();


                let newUser = new User({
                    userName: value.userName,
                    managerName: value.managerName,
                    password: generateHash(value.password),
                    role: "Manager",
                    profilePhoto: profilePhoto || '',
                    storeId: store._id
                });

                await newUser.save();

                return res.status(201).json({
                    "status": 201,
                    "message": "Store and Manger is created"
                });
                //}
            }

        }
        catch (error) {
            return res.status(500).json({
                "status": false,
                message: error
            });
        }
    }


    //get all store managers
    async getall(req, res) {
        try {

            let pageNo = parseInt(req.query.pageNo ? req.query.pageNo : 1);
            let size = 10;
            let skip = size * (pageNo - 1);
            let limit = size;

            let data = await User.aggregate([
                {
                    $match: {
                        "role": "Manager",
                        "accountStatus": 1
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storeData'
                    }
                },
                {
                    '$unwind': {
                        path: '$storeData',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        password: 0,
                        __v: 0,
                        "storeData.createdAt": 0,
                        "storeData.updatedAt": 0
                    }
                },
                {
                    "$skip": skip
                }, {
                    "$limit": limit
                }
            ]).allowDiskUse(true);

            let total = await User.aggregate([
                {
                    $match: {
                        "role": "Manager",
                        "accountStatus": 1
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storeData'
                    }
                },
                {
                    '$unwind': {
                        path: '$storeData',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        password: 0,
                        __v: 0,
                        "storeData.createdAt": 0,
                        "storeData.updatedAt": 0
                    }
                },
                {
                    '$count': 'sum'
                }
            ]);
            if (total[0] !== undefined)
                total = total[0].sum;
            else
                total = 0;

            await Promise.all(data.map(async (val, index) => {
                await new Promise(async (res, rej) => {
                    // store manager
                    if (val.profilePhoto !== undefined && val.profilePhoto !== '')
                        val.profilePhoto = process.env.ImageUrl + 'manager_img/' + val.profilePhoto;

                    return res(val);
                });
            }));

            return res.status(200).json({
                "status": 200,
                "message": "Store and Manger list",
                "data": data,
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


    //Edit store
    async editstore(req, res) {
        try {

            if (req.params.storeId === undefined) {
                return res.status(422).json({ //Unprocessable Entity 422
                    "status": 422,
                    "message": 'store Id requried'
                });
            }

            let id = req.params.storeId;
            let data = await User.aggregate([
                {
                    $match: {
                        "storeId": mongoose.Types.ObjectId(id)
                    }
                },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storeData'
                    }

                },
                {
                    '$unwind': {
                        path: '$storeData',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        password: 0,
                        __v: 0,
                        "storeData.createdAt": 0,
                        "storeData.updatedAt": 0,
                        "storeData.__v": 0
                    }
                }
            ]);

            if (data[0].profilePhoto != undefined && data[0].profilePhoto != "")
                data[0].profilePhoto = process.env.ImageUrl + 'manager_img/' + data[0].profilePhoto;

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

    // update store and manager
    async updatestore(req, res) {
        try {

            //store id
            if (req.params.storeId === undefined) {
                return res.status(422).json({
                    "status": 422,
                    "message": 'storeId requried'
                });
            }
            let schema = Joi.object().keys({
                //store collection
                name: Joi.string().label('name'),
                countryCode: Joi.string().label('countrycode').allow(''),
                number: Joi.string().trim().label('number'),
                //storeLocation: Joi.string().trim().label('country').valid(['unitedKingdom', 'india', 'maldives']).required(),
                location: Joi.string().trim().label('country'),
                password: Joi.string().trim().label('password'),
                //userName is for store manager signin
                // user collection
                userName: Joi.string().trim().label('userName'),
                //  manager name
                managerName: Joi.string().trim().label('managerName'),
                address: Joi.string().trim().label('address')

            });

            let {
                value,
                error
            } = Joi.validate(req.body, schema, {
                abortEarly: true
            });

            if (error)
                return res.status(500).json({
                    "status": 0,
                    "message": error.map(error => error.message)
                });


            let storeId = req.params.storeId;

            var files = {};
            if (req.file) {
                let imagename = req.file.filename;
                files = {
                    profilePhoto: imagename
                }
            }
            else {
                files = {
                    profilePhoto: ''

                }
            }

            // update store
            await Store.findOneAndUpdate({
                "_id": storeId
            }, {
                ...value,
                ...{
                    location: value.location.toLowerCase()
                }
            });

            //update manager
            let userData = await User.findOneAndUpdate({
                "storeId": storeId
            }, {
                ...value,
                ...{
                    password: generateHash(value.password)
                },
                ...files
            });

            userData.profilePhoto = process.env.ImageUrl + 'manager_img/' + userData.profilePhoto;

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

    // Delete the store and manager
    async deletestore(req, res) {
        try {


            if (req.params.storeId === undefined) {
                return res.status(422).json({
                    "status": 422,
                    "message": 'storeId requried'
                });
            }

            await Stock.findOneAndUpdate({
                "storeId": req.params.storeId
            }, {
                $set: {
                    Deleted: 3
                }
            });

            await Store.findOneAndUpdate({
                "_id": req.params.storeId
            }, {
                $set: {
                    storeStatus: 3
                }
            });

            await User.findOneAndUpdate({
                "storeId": req.params.storeId
            }, {
                $set: {
                    accountStatus: 3
                }
            });

            return res.status(200).json({
                "status": 200,
                "message": "Manager and Store Has Been Deleted"
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }


    async dashboard(req, res) {

        try {

            let product = await Product.aggregate([
                {
                    $match: {
                        productStatus: 1
                    }
                },
                {
                    $count: 'sum'
                }
            ]);
            let customer = await Customer.aggregate([
                {
                    $match: {
                        customerStatus: 1
                    }
                },
                {
                    $count: 'sum'
                }
            ]);
            let store = await Store.aggregate([
                {
                    $match: {
                        storeStatus: 1
                    }
                },
                {
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
                    $count: 'sum'
                }
            ]);
            let invoice = await Invoice.aggregate([
                {
                    $match: {
                        invoiceDelete: 1
                    }
                }, {
                    $lookup: {
                        from: 'stores',
                        localField: 'storeId',
                        foreignField: '_id',
                        as: 'storedetails'
                    }
                },
                {
                    '$unwind': {
                        path: '$storedetails',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $match: {
                        "storedetails.storeStatus": 1

                    }
                },
                {
                    $count: 'sum'
                }
            ]);

            // calculating the total number of product 
            if (product[0] !== undefined)
                product = product[0].sum;
            else
                product = 0;

            // calculating the total number of product 
            if (customer[0] !== undefined)
                customer = customer[0].sum;
            else
                customer = 0;

            // calculating the total number of product 
            if (store[0] !== undefined)
                store = store[0].sum;
            else
                store = 0;

            // calculating the total number of product 
            if (invoice[0] !== undefined)
                invoice = invoice[0].sum;
            else
                invoice = 0;



            return res.status(200).json({
                "status": 200,
                "product": product,
                "customer": customer,
                "invoice": invoice,
                "store": store
            });

        } catch (error) {
            return res.status(500).json({
                "status": false,
                message: error.details.map(d => d.message)
            });
        }
    }


}
userAuth = new userAuth();
module.exports = userAuth;