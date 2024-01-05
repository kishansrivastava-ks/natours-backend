const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');

// for eg. new Email(user,url).sendWelcome();

module.exports = class Email {
  // the email objects created from this email class are used to send the emails
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Kishan Srivastava <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // sendgrid
      nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      // service: 'Gmail', - for using gmail service
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Activate in gmail "less secure app" option
    });
  }

  // send the actual email
  async send(template, subject) {
    // 1. render the html based on a pug template
    const html = pug.renderFile(
      // html is generated from the pug template and the email is send in the form of that html
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
    ); // this will take in a file and render the pug code into an html
    // 2. define the email options
    const mailOptions = {
      from: this.from,
      to: this.to, // that we pass into the function
      subject,
      html,
      text: convert(html, { wordwrap: 130 }),
    };

    // 3. Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'welcome to the natours family');
    // welcome is the template and the rest is the subject by default
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }
};
