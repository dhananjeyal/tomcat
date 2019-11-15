const pdf = require('html-pdf'),
    concat = require('concat-stream'),
    ejs = require('ejs'),
    mailer = require('../helpers/mailFunctions');
const path = require('path');


class pdffile {

    async createhtml(data) {

        try {
            let products = data[0].products, //Array
                invoiceNo = data[0].invoiceNo,
                billDate = data[0].billDate,
                total = data[0].total,
                subtotal = data[0].subtotal,
                discount = data[0].discount,
                discountAmount = data[0].discountAmount,
                tax = data[0].tax,
                taxAmount = data[0].taxAmount,
                storename = data[0].data[0].storename,
                taxnumber = data[0].taxNumber,
                invoiceaddress = data[0].invoiceAddress,
                // storelocation = data[0].data[0].storelocation,
                // storeaddress = data[0].data[0].storeaddress,
                storenumber = data[0].data[0].storenumber,
                storecountrycode = data[0].data[0].storecountrycode,
                customeremail = data[0].data[0].customeremail,
                customeraddress = data[0].data[0].customeraddress,
                customercountry = data[0].data[0].customercountry,
                customercountryCode = data[0].data[0].customercountryCode,
                customermobileNumber = data[0].data[0].customermobileNumber,
                customername = data[0].data[0].customername;


            // To convert the bill date to DD-MM-YYYY
            let year = billDate.getFullYear();
            let month = billDate.getMonth() + 1;
            let dt = billDate.getDate();

            if (dt < 10) {
                dt = '0' + dt;
            }
            if (month < 10) {
                month = '0' + month;
            }

            let date = dt + '-' + month + '-' + year;

            var options = {
                "format": "A4",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid
                "orientation": "portrait", // portrait or landscape
                //"border": "0",             // default is 0, units: mm, cm, in, px
                "border": {
                    "top": "1cm",            // default is 0, units: mm, cm, in, px
                    "right": "2cm",
                    "bottom": "1cm",
                    "left": "2cm"
                },
                // "footer":{
                //     "height":"28mm",
                //     "contents": '<link rel="stylesheet" href="<%= style %>"> <p style="font-size: 12px;font-family:"Champagne & Limousines Regular">If you have any questions concerning this invoice, use the following information info@ivarjewelry.com</p> <p  style="font-size: 12px;font-family:"Champagne & Limousines Regular"> Hope you enjoy the jewelary as much as we enjoyed creating it...!</p>'
                // },
                "font-family": 'Champagne & Limousines Regular',
                "type": "pdf",
            };
            let htmlFilePath = path.join(__dirname, 'html.ejs');

            //process.env.InvoiceUrl + 'product_img/' + ;
            let html = await ejs.renderFile(htmlFilePath, {
                invoiceNo: invoiceNo,
                date: date, //billDate
                total: total,
                subtotal: subtotal,
                discount: discount,
                discountAmount: discountAmount,
                tax: tax,
                taxAmount: taxAmount,
                storename: storename,
                // storelocation: storelocation,
                storenumber: storenumber,
                storecountrycode: storecountrycode,
                //storeaddress: storeaddress,
                customeremail: customeremail,
                customeraddress: customeraddress,
                customercountry: customercountry,
                customercountryCode: customercountryCode,
                customermobileNumber: customermobileNumber,
                taxnumber: taxnumber,
                invoiceaddress: invoiceaddress,
                customername: customername,
                products: products,
                url: process.env.InvoiceUrl + 'excel/' + 'invoice_logo.png',
                style: process.env.InvoiceStyle + 'style/' + 'style.css'
            }).catch((err) => {
                console.log(err)
            });

            await Promise.all(pdf.create(html, options).toStream(function (err, stream) {
                stream.pipe(concat(async (data) => {
                    let fileContents = Buffer.from(data, 'base64');
                    await mailer.email(fileContents, customeremail);
                }));

                return true
            }))
            return true

        } catch (error) {
            return error
        }
    }

}

pdffile = new pdffile();
module.exports = pdffile;