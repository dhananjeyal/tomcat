const validate = function (req, res, next) {
    
    if (req.user.role !== "admin" && req.user.role !== 'Manager')
        return res.status(401).json({
            "message": 'Not Authorised to access this endpoint'
        });
    next();
}

const adminvalid = function (req, res, next) {
    if (req.user.role !== "admin")
        return res.status(401).json({
            "message": 'Not Authorised to access this endpoint'
        });
    next();

}



module.exports = {
    validate, adminvalid
};