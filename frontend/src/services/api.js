import axios from "axios";

const API = axios.create({
  baseURL: "https://whatsapp-messengers-production.up.railway.app/api"
  
});

export const getChats = () => API.get("/chats");
export const getMessages = (wa_id) => API.get(`/chats/${wa_id}`);
export const sendMessage = (msg) => API.post("/send", msg);
