const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// We want to add the logo in the slim variant before breadcrumbs, or if breadcrumbs are empty.
const slimNav = `            {/* Breadcrumb Left */}
            <nav className="flex-1 flex items-center text-[15px] md:text-base font-semibold tracking-wide overflow-x-auto scrollbar-hide py-2 pr-4">`;

const newSlimNav = `            {/* Breadcrumb Left & Logo */}
            <nav className="flex-1 flex items-center text-[15px] md:text-base font-semibold tracking-wide overflow-x-auto scrollbar-hide py-2 pr-4">
              {breadcrumbs.length === 0 && (
                <div className="flex items-center cursor-pointer group" onClick={onNavigateHome || (() => window.location.href = '/')}>
                  <span className="text-xl md:text-2xl font-black tracking-wider bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent hover:opacity-90 transition-all duration-300">
                    miyoro
                  </span>
                </div>
              )}
              {breadcrumbs.length > 0 && (
                <div className="flex items-center cursor-pointer group mr-4" onClick={onNavigateHome || (() => window.location.href = '/')}>
                  <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent hover:opacity-90 transition-all duration-300">
                    M
                  </span>
                </div>
              )}`;

content = content.replace(slimNav, newSlimNav);
fs.writeFileSync('src/components/Header.tsx', content);
