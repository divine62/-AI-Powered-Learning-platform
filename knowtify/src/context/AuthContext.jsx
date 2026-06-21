import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for saved token and fetch profile
  useEffect(() => {
    const token = localStorage.getItem("kt_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get(`${API}/user/profile`)
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem("kt_token"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { token, user } = res.data;
    localStorage.setItem("kt_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    const { token, user } = res.data;
    localStorage.setItem("kt_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(user);
    return user;
  };

  const updateProfile = async (data) => {
    const res = await axios.put(`${API}/user/profile`, data);
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("kt_token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);