import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-28">
        <Outlet />
      </main>
    </div>
  )
}
