"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform duration-300">
                 <img src="/file.svg" alt="Logo" className="w-6 h-6 brightness-0 invert" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight group-hover:text-blue-700 transition-colors">
                FasterPost
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              Next-generation automated logistics network. Send, track, and receive packages 24/7 with our smart locker system.
            </p>
            <div className="flex gap-4 pt-2">
              <SocialLink href="#" icon={<Facebook className="w-4 h-4" />} />
              <SocialLink href="#" icon={<Twitter className="w-4 h-4" />} />
              <SocialLink href="#" icon={<Instagram className="w-4 h-4" />} />
              <SocialLink href="#" icon={<Linkedin className="w-4 h-4" />} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href="/">Home</FooterLink>
              <FooterLink href="/send-package">Send Package</FooterLink>
              <FooterLink href="/pickup-package">Pickup Package</FooterLink>
              <FooterLink href="/business">Business Solutions</FooterLink>
              <FooterLink href="/courier/login">Courier Login</FooterLink>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6">Legal</h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href="/terms">Terms & Conditions</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/cookies">Cookie Policy</FooterLink>
              <FooterLink href="/security">Security</FooterLink>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 text-gray-500">
                <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                <span>123 Logistics Blvd,<br />Warsaw, PL 00-001</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500">
                <Phone className="w-5 h-5 text-blue-600 shrink-0" />
                <span>+48 123 456 789</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500">
                <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                <span>support@fasterpost.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} FasterPost. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-blue-600 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition">Terms</Link>
            <Link href="/sitemap" className="hover:text-blue-600 transition">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon }) {
  return (
    <a 
      href={href} 
      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
    >
      {icon}
    </a>
  );
}

function FooterLink({ href, children }) {
  return (
    <li>
      <Link href={href} className="text-gray-500 hover:text-blue-600 transition-colors">
        {children}
      </Link>
    </li>
  );
}