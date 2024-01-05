/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  // making an http request using AXIOS
  try {
    const res = await axios({
      // axios returns a promise
      method: 'POST',
      url: 'http://localhost:8000/api/v1/users/login',
      data: {
        // this is what is expected in the request body while logging in
        email,
        password,
      },
    });
    console.log(res);

    if (res.data.status === 'Success') {
      showAlert('success', 'Logged in Successfully!');
      // we need to reload in order for the changes to appear
      window.setTimeout(() => {
        location.assign('/'); // go to the homepage after 1.5s
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://localhost:8000/api/v1/users/logout',
    });
    if (res.data.status === 'success') location.reload(true); // this would implement a reload from the server and not from the cache
  } catch (err) {
    showAlert('error', 'Error logging out! Try Again.');
  }
};
