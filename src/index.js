import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from './front/components/Navbar';
import Home from './front/pages/Home';       // <-- importar Home
import Login from './front/pages/Login';
import Register from './front/pages/Register';
import Profile from "./front/pages/Profile";
import Posts from "./front/pages/Posts";
import NewPost from "./front/pages/NewPost";
import MyPosts from "./front/pages/MyPosts";
import EditPost from "./front/pages/EditPost";


const App = () => (
  <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />   {/* <-- usar Home aquí */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/posts" element={<Posts />} />
      <Route path="/new-post" element={<NewPost />} />
      <Route path="/my-posts" element={<MyPosts />} />
      <Route path="/posts/:id/edit" element={<EditPost />} />  
    </Routes>
  </BrowserRouter>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);