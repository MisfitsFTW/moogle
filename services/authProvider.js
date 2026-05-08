const msal = require('@azure/msal-node');
const { msalConfig, REDIRECT_URI, SCOPES } = require('../config/authConfig');

class AuthProvider {
    constructor() {
        this.msalClient = new msal.ConfidentialClientApplication(msalConfig);
    }

    async getAuthCodeUrl(req, res, next) {
        const authCodeUrlParameters = {
            scopes: SCOPES,
            redirectUri: REDIRECT_URI,
            responseMode: 'query',
        };

        try {
            const response = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
            res.redirect(response);
        } catch (error) {
            next(error);
        }
    }

    async acquireTokenByCode(req, res, next) {
        const tokenRequest = {
            code: req.query.code,
            scopes: SCOPES,
            redirectUri: REDIRECT_URI,
        };

        try {
            const response = await this.msalClient.acquireTokenByCode(tokenRequest);

            // Log tokens for debugging/decoding
            console.log('--- TOKEN DEBUG START ---');
            console.log('ID Token:', response.idToken);
            console.log('Access Token:', response.accessToken);
            console.log('--- TOKEN DEBUG END ---');

            // Extract claims from ID Token
            const idTokenClaims = response.idTokenClaims;
            const userData = {
                id: idTokenClaims.oid || idTokenClaims.sub,
                name: idTokenClaims.given_name || idTokenClaims.name,
                surname: idTokenClaims.family_name,
                email: idTokenClaims.emails ? idTokenClaims.emails[0] : idTokenClaims.email,
                idCard: idTokenClaims.nidorpassport
            };

            // Store in session
            req.session.user = {
                ...response.account,
                name: userData.name,
                surname: userData.surname,
                email: userData.email,
                idCard: userData.idCard,
                idToken: response.idToken,
                accessToken: response.accessToken
            };
            req.session.isAuthenticated = true;

            // Save to database
            const dataService = require('./dataService');
            await dataService.saveUser(userData);

            res.redirect('/');
        } catch (error) {
            next(error);
        }
    }

    logout(req, res) {
        req.session.destroy(() => {
            const logoutUrl = `${msalConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${process.env.B2C_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000'}`;
            res.redirect(logoutUrl);
        });
    }

    isAuthenticated(req, res, next) {
        if (req.session.isAuthenticated) {
            return next();
        }
        res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = new AuthProvider();
