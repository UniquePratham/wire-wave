// lib/profile.js
import apiClient from "./axios";

// Create profile (POST /profile)
export const createProfile = async ({ name, about, avatar_url }) => {
  const res = await apiClient.post("/profile", { name, about, avatar_url }); // cookies sent via withCredentials
  return res.data;
};

// Update profile (PUT /profile)
export const updateProfile = async ({ name, about, avatar_url }) => {
  const res = await apiClient.put("/profile", { name, about, avatar_url });
  return res.data;
};
