const nodemailer = require('nodemailer'),
    smtpTransport = require('nodemailer-smtp-transport');
// hbs = require('nodemailer-express-handlebars'),
// __ = require('./globalFunctions');

const testEmail = true;
const testEmailId = 'muthukavi0306@gmail.com';
const mailcc = 'kailash@doodleblue.com';

const transporter = nodemailer.createTransport((smtpTransport({
    service: 'gmail',
    host: 'smtp.gmail.com', // 'smtpout.secureserver.net',
    port: 465,
    secure: true,
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    }
})));

// const options = {
//     viewEngine: {
//         extname: '.hbs',
//         layoutsDir: '../public/email/',
//     },
//     viewPath: 'public/email/',
//     extName: '.hbs'
// };


class mail {

    async  email(data, email) {

        let useremail = email; // customer email

        let mailOptions = {
            from: 'Ivar <ivar@admin.com>',
            to: useremail,
            subject: 'Ivar Invoice: purchased invoice from Ivar',
            //text: 'This email as invoice',
            html: "<b>This is a system generated mail. Please do not reply to this email ID. If you have a query or need any clarification you may: <br>Contact Us: info@ivarjewelry.com  </b>",
            cc: mailcc,
            attachments: [{
                filename: 'invoice.pdf',
                content: data,
                contentType: 'application/pdf',

            }],

        };
        await this.send(mailOptions, false);

        return true
    };

    send(mailOptions, withTemplate = false) {

        // if (withTemplate)
        //     transporter.use('compile', hbs(options));

        transporter.sendMail(mailOptions).then((data) => {
            return data

        }).catch((err) => {
            return err
        });
    }
}

mail = new mail();
module.exports = mail;