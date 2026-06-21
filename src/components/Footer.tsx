import { Github } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="w-full border-t border-white/10 mt-auto">
      <div className="w-full px-6 md:px-10 lg:px-14 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
        
        {/* Left: Logo */}
        <div 
          className="flex-1 flex justify-start items-center cursor-pointer group" 
          onClick={() => navigate("/")}
        >
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent hover:opacity-90 transition-all duration-300">
            miyoro
          </span>
        </div>

        {/* Center: Disclaimer */}
        <div className="flex-[2] flex justify-center text-center">
          <p className="text-white/70 text-xs md:text-sm font-medium md:whitespace-nowrap">
            Miyoro does not host any content. All media is provided by third-party services.
          </p>
        </div>

        {/* Right: GitHub Icon */}
        <div className="flex-1 flex justify-end items-center">
          <a 
            href="https://github.com/saisantoshsai3/miyoro" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-all duration-300 hover:scale-110 hover:brightness-125"
            aria-label="GitHub Repository"
          >
            <Github size={20} strokeWidth={2} />
          </a>
        </div>

      </div>
    </footer>
  );
}
