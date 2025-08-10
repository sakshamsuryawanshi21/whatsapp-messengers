import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export const getChats = () => API.get("/chats");
export const getMessages = (wa_id) => API.get(`/chats/${wa_id}`);
export const sendMessage = (msg) => API.post("/send", msg);
