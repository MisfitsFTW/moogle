const msal = require('@azure/msal-node');

const msalConfig = {
    auth: {
        clientId: process.env.B2C_CLIENT_ID,
        authority: `${process.env.B2C_INSTANCE}/${process.env.B2C_DOMAIN}/${process.env.B2C_SIGN_IN_POLICY}`,
        clientSecret: process.env.B2C_CLIENT_SECRET,
        knownAuthorities: [process.env.B2C_DOMAIN.replace('.onmicrosoft.com', '.b2clogin.com')],
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Info,
        }
    }
};

const REDIRECT_URI = process.env.B2C_REDIRECT_URI;
const POST_LOGOUT_REDIRECT_URI = process.env.B2C_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000';
const SCOPES = process.env.B2C_SCOPES ? process.env.B2C_SCOPES.split(' ') : [];

module.exports = {
    msalConfig,
    REDIRECT_URI,
    POST_LOGOUT_REDIRECT_URI,
    SCOPES
};
