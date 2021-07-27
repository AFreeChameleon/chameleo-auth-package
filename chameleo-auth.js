function convertRespToJSON(string, status) {
    try {
        var json = JSON.parse(string);
        if (json.errors) {
            return {
                errors: json.errors,
                response: json.response,
                status: status,
            }
        } else {
            return {
                errors: [],
                response: json.response,
                status: status,
            }
        }
    } catch (err) {
        return {
            status: status,
            response: string,
            errors: []
        };
    }
}

function inactivityTime(ws) {
    var time;
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onmousedown = resetTimer;
    document.ontouchstart = resetTimer;
    document.onclick = resetTimer;
    document.onkeydown = resetTimer;
    document.addEventListener('scroll', resetTimer, true);
    
    function setAway() {
        alert('YOURE AWAY HUH?!')
    }

    function resetTimer() {
        clearTimeout(time);
        time = setTimeout(setAway, 60000)
        // 1000 milliseconds = 1 second
    }
}

function isUserLoggedIn(server, auth_token, cb) {
    console.log(server);
    var loggedInXMLRequest = new XMLHttpRequest();
    loggedInXMLRequest.withCredentials = true;
    loggedInXMLRequest.onload = function(e) {
        if (loggedInXMLRequest.getAllResponseHeaders().indexOf("chameleo-auth") !== -1) {
            cb(this.status === 200, loggedInXMLRequest.getResponseHeader('chameleo-auth'));
        } else {
            cb(this.status === 200, null)
        }
    }
    loggedInXMLRequest.open("POST", server + '/user/logged-in', true);
    if (loggedInXMLRequest.getAllResponseHeaders().indexOf("chameleo-auth") !== -1) {
        loggedInXMLRequest.setRequestHeader('chameleo-auth', auth_token);
    }
    loggedInXMLRequest.send();
}

function setUpWebsockets(root, url) {
    root.ws = new WebSocket(url);
    root.ws.onopen = function(e) {
        console.log('Connected to: ', url)
    }
}

function ChameleoAuth(container_name, server) {
    var root = this;
    this.containerName = container_name;
    this.server = server;
    var getConfigXMLRequest = new XMLHttpRequest();
    getConfigXMLRequest.withCredentials = true;
    getConfigXMLRequest.onload = function(e) {
        var config = convertRespToJSON(this.responseText, this.status);
        console.log(config)
        if (config.errors.length !== 0) {
            throw "Couldn't retrieve config.";
        } else {
            root.containerConfig = config.response;
            console.log(root.containerConfig);
            isUserLoggedIn(
                root.server, 
                root.auth_token,
                function(loggedIn, auth_token) {
                    if (loggedIn && auth_token) {
                        root.auth_token = auth_token;
                        inactivityTime();
                        setUpWebsockets(root, 'ws://localhost:3002/?auth_token=' + root.auth_token);
                    }
            });
        }
    }
    getConfigXMLRequest.open("GET", this.server + "/config", true);
    getConfigXMLRequest.send();
}

ChameleoAuth.prototype.oauthLogin = function(type) {
    if (this.containerConfig.auth.oauth.enabled) {
        var oauthLoginXMLRequest = new XMLHttpRequest();
        oauthLoginXMLRequest.withCredentials = true;
        oauthLoginXMLRequest.onload = function(e) {
            var resObj = convertRespToJSON(this.responseText, this.status);
            window.open(resObj.response, "_blank", 'width=800,height=600,status=0,toolbar=0');
        }
        oauthLoginXMLRequest.open("GET", this.server + "/oauth/" + type, true);
        oauthLoginXMLRequest.send();
    } else {
        throw 'OAuth not enabled on this container.'
    }
}

/*
* @param {Object} - contains the data of the user
* @param {Function} - cb with response parameter, calls after the request is sent
*/
ChameleoAuth.prototype.register = function(user, cb) {
    var registerXMLRequest = new XMLHttpRequest();
    registerXMLRequest.withCredentials = true;
    registerXMLRequest.onload = function(e) {
        cb(convertRespToJSON(this.responseText, this.status));
    }
    registerXMLRequest.open("POST", this.server + "/register", true);
    registerXMLRequest.setRequestHeader("Content-Type", "application/json");
    registerXMLRequest.send(JSON.stringify(user));
}

/*
* @param {String} - username, will be the email if there's no column with type: username in the users' model
* @param {String} - password
* @param {Function} - cb with response parameter, calls after the request is sent
*/
ChameleoAuth.prototype.login = function(username, password, cb) {
    var root = this;
    var loginXMLRequest = new XMLHttpRequest();
    loginXMLRequest.withCredentials = true;
    loginXMLRequest.onload = function(e) {
        if (this.status === 200) {
            root.auth_token = this.getResponseHeader('chameleo-auth');
            console.log(root.auth_token)
            setUpWebsockets(root, 'ws://localhost:3002/?auth_token=' + root.auth_token)
        }
        cb(convertRespToJSON(this.responseText, this.status));
    }
    loginXMLRequest.open("POST", this.server + "/login", true);
    loginXMLRequest.setRequestHeader("Content-Type", "application/json");
    loginXMLRequest.send(JSON.stringify({username: username, password: password}));
}

/*
* @param {Function} - cb with response parameter, calls after the request is sent
*/
ChameleoAuth.prototype.logout = function(cb) {
    var root = this;
    var logoutXMLRequest = new XMLHttpRequest();
    logoutXMLRequest.withCredentials = true;
    logoutXMLRequest.onload = function(e) {
        root.ws = undefined;
        root.auth_token = undefined;
        cb(convertRespToJSON(this.responseText, this.status));
    }
    logoutXMLRequest.open("POST", this.server + "/logout", true);
    if (this.auth_token) {
        logoutXMLRequest.setRequestHeader('chameleo-auth', this.auth_token);
    }
    logoutXMLRequest.send(null);
}

/*
* @param {Function} - cb with response parameter, calls after the request is sent
*/
ChameleoAuth.prototype.verifyUser = function(cb) {
    var verifyUserXMLRequest = new XMLHttpRequest();
    verifyUserXMLRequest.withCredentials = true;
    verifyUserXMLRequest.onload = function(e) {
        cb(convertRespToJSON(this.responseText, this.status));
    }
    verifyUserXMLRequest.open("POST", this.server + "/user/logged-in", true);
    if (this.auth_token) {
        verifyUserXMLRequest.setRequestHeader('chameleo-auth', this.auth_token);
    }
    verifyUserXMLRequest.send(null);
}

/*
* @param {String} - password, will be the email if there's no column with type: username in the users' model
* @param {Object} - data to edit the user with
* @param {Function} - cb with response parameter, calls after the request is sent
*/
ChameleoAuth.prototype.setAccountDetails = function(password, newAccountDetails, cb) {
    var editUserXMLRequest = new XMLHttpRequest();
    editUserXMLRequest.withCredentials = true;
    editUserXMLRequest.onload = function(e) {
        cb(convertRespToJSON(this.responseText, this.status));
    }
    editUserXMLRequest.open("PUT", this.server + "/user/edit", true);
    editUserXMLRequest.setRequestHeader("Content-Type", "application/json");
    if (this.auth_token){
        editUserXMLRequest.setRequestHeader('chameleo-auth', this.auth_token);
    }
    editUserXMLRequest.send(JSON.stringify({
        password: password,
        account_details: newAccountDetails,
    }));
}

ChameleoAuth.prototype.setAccountPassword = function(oldPassword, newPassword, cb) {
    var changePasswordXMLRequest = new XMLHttpRequest();
    changePasswordXMLRequest.withCredentials = true;
    changePasswordXMLRequest.onload = function(e) {
        cb(convertRespToJSON(this.responseText, this.status));
    }
    changePasswordXMLRequest.open("PUT", this.server + "/user/change-password", true);
    changePasswordXMLRequest.setRequestHeader("Content-Type", "application/json");
    if (this.auth_token) {
        changePasswordXMLRequest.setRequestHeader('chameleo-auth', this.auth_token);
    }
    changePasswordXMLRequest.send(JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
    }));
}

ChameleoAuth.prototype.deleteUser = function(password, cb) {
    var deleteUserXMLRequest = new XMLHttpRequest();
    deleteUserXMLRequest.withCredentials = true;
    deleteUserXMLRequest.onload = function(e) {
        cb(convertRespToJSON(this.responseText, this.status));
    }
    deleteUserXMLRequest.open("DELETE", this.server + "/user/delete", true);
    deleteUserXMLRequest.setRequestHeader("Content-Type", "application/json");
    if (this.auth_token) {
        deleteUserXMLRequest.setRequestHeader('chameleo-auth', this.auth_token);
    }
    deleteUserXMLRequest.send(JSON.stringify({
        password: password
    }));
}

ChameleoAuth.prototype.verifyUserToken = function(token, cb) {
    var verifyUserTokenXMLRequest = new XMLHttpRequest();
    verifyUserTokenXMLRequest.withCredentials = true;
    verifyUserTokenXMLRequest.onload = function(e) {
        cb(convertRespToJSON(this.responseText, this.status));
    }
    verifyUserTokenXMLRequest.open("GET", this.server + "/user/verify/:token" + token, true);
    verifyUserTokenXMLRequest.send();
}