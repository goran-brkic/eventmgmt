const express = require('express');
const cors = require('cors');
const { auth } = require("express-oauth2-jwt-bearer");
const jwtAuthz = require('express-jwt-authz');
const axios = require('axios');
var path = require('path');



const app = express();
app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var authServer = 'https://dev-7xjdvaspwt881ruz.eu.auth0.com';

const checkMemberPermissions = jwtAuthz(['read:profile', 'update:database'], { 
    customScopeKey: 'permissions', 
    customUserKey: 'auth',
    checkAllScopes: 'true'
});

const permissionsMiddleware = (req, res, next) => {
    // used to move permissions outside of paylod
    // jwtAuthz doesn't know to look inside payload therefore checkPermissions doesn't work properly without this
    const payload = req.auth.payload
    Object.assign(req.auth, {permissions: Array.from(payload.permissions)});
    next();
}


const checkJwt = auth({
    audience: 'https://eventmgmt.com',
    issuerBaseURL: `${authServer}`,
    tokenSigningAlg: "RS256"
});


app.get('/api/member', checkJwt, permissionsMiddleware, checkMemberPermissions, async (req, res) => {
    const accesstoken = req.auth.token;
    try{
        const userInfoResponse = await axios.post(`${authServer}/userinfo`, {},  {
                                                        headers : {
                                                            Authorization : `Bearer ${accesstoken}`
                                                        }}); 
        const user = userInfoResponse.data;
        res.json(JSON.stringify(user)); // if this returns, the user has the required authorization
    }
    catch(err) {
        console.log(err);
    }
});


app.use(function(err, req, res, next) {
    if (err.name === "UnauthorizedError") {
      return res.status(401).send({ msg: "Invalid token" });
    }
  
    next(err, req, res);
});

    
const port = 3500;
const hostname = 'localhost';
app.listen(port, hostname, () => {
    console.log(`Web API running at http://localhost:${port}/`);
});
    

