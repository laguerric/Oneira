import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DreamCarousel from './components/DreamCarousel';
import ProjectVision from './components/ProjectVision';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <div className="grid-bg" />
      <Navbar />
      <Hero />
      <DreamCarousel />
      <ProjectVision />
      <Footer />
    </>
  );
}
