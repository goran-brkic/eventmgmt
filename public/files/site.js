let auth0 = null;
const fetchAuthConfig = () => fetch("/auth_config.json");

const configureClient = async () => {
    const response = await fetchAuthConfig();
    const config = await response.json();

    auth0 = await createAuth0Client({
      domain: config.domain,
      client_id: config.clientId,
      audience: config.audience
    });
};

const serverUri = "http://127.0.0.1:4091";


const initialLogin = async () => {
  try {    
    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();

    // Make the call to the API, setting the token
    // in the Authorization header
    const response = await fetch(`${serverUri}/api/member`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Fetch the JSON result
    const responseData = await response.json();     

} catch (e) {
    // Display errors in the console
    console.log(e);     
  }
};

 

const showMemberOptions = async () => {
  try {    
    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();   

    // Make the call to the API, setting the token
    // in the Authorization header
    const response = await fetch(`${serverUri}/api/member`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  
    // Fetch the JSON result
    const responseData = await response.json();

    if(responseData){
      // user is authorized - member
      document.getElementById('user').style.display = "block";
      document.getElementById('user').innerHTML = `<b>Prijavljeni ste kao member.</b>`
      document.getElementById('dropdown').style.display = "block";
      
      document.getElementById('profile').addEventListener("click", () => {
        document.getElementById('token1').value = token;
        form1.submit();
      });

      document.getElementById('update').addEventListener("click", () => {
        document.getElementById('token2').value = token;
        form2.submit();
      });
      
    } else {
      document.getElementById('username').innerHTML = "none";
    }
    

} catch (e) {
    // Display errors in the console
    console.log(e);
  }
};

const login = async () => {
    await auth0.loginWithRedirect({
        redirect_uri: window.location.origin
    });
};

const logout = async () => {
    await auth0.logout({
        returnTo: window.location.origin
    });
};

window.onload = async () => {
    //showCommentSection();

    await configureClient();
    document.getElementById('btnLogout').addEventListener("click", logout);
    document.getElementById('btnLogin').addEventListener("click", login);

    
    await initialLogin();

    const isAuthenticated = await auth0.isAuthenticated();
    updateUI();
    if (isAuthenticated) {
        // show the gated content
        showMemberOptions();
        return;
    }

    //must be included to handle redirect!
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {

        // Process the login state
        await auth0.handleRedirectCallback();
        
        updateUI();

        // Use replaceState to redirect the user away and remove the querystring parameters
        window.history.replaceState({}, document.title, "/");
    }
  };

  const updateUI = async () => {
    const isAuthenticated = await auth0.isAuthenticated();
    document.getElementById('btnLogin').style.display = isAuthenticated ? "none" : "block" ;
    document.getElementById('btnLogout').style.display = isAuthenticated ? "block" : "none" ;
  }




