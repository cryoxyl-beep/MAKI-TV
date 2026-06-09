const fs = require('fs');

let code = fs.readFileSync('src/components/WatchPage.tsx', 'utf-8');

// Find the main viewport section
const mainViewportIdx = code.indexOf('{/* =============== MAIN VIEWPORT =============== */}');

// The layout right now is:
// <div className="max-w-[1700px] mx-auto px-4 lg:px-6 py-6 flex flex-col gap-8">
//   <div className="flex flex-col lg:flex-row gap-6">
//     <div className="w-full lg:w-[71%] ..."> ... PLAYER ... </div>
//     <div className="w-full lg:w-[29%] ..."> ... UP NEXT ... </div>
//   </div>
//   <div className="w-full flex flex-col gap-4 pb-4"> ... EPISODE INFO ... </div>
//   <div className="w-full"> ... MORE LIKE THIS ... </div>
// </div>

const startOfLayout = code.indexOf('      {/* =============== MAIN VIEWPORT =============== */}');
const endOfFirstRow = code.indexOf('        {/* ROW 2: Episode Info (Full Width) */}');
const endOfSecondRow = code.indexOf('        {/* ROW 3: More Like This (Full Width) */}');
const endOfThirdRow = code.indexOf('      </div>\n    </div>');

// Extract chunks
const playerChunk = code.substring(
  code.indexOf('          {/* LEFT: Player */}'),
  code.indexOf('          {/* RIGHT: Up Next */}')
);

const upNextChunk = code.substring(
  code.indexOf('          {/* RIGHT: Up Next */}'),
  code.indexOf('        </div>\n\n        {/* ROW 2:')
);

const episodeInfoChunk = code.substring(
  code.indexOf('          {/* Episode Info */}'),
  code.indexOf('        {/* ROW 3:')
).replace(/          <\/div>\n\n$/, ''); 

const moreLikeThisChunk = `
          {/* Recommendations Component */}
          {anime?.anilistId && (
            <RecommendationsList anilistId={anime.anilistId} onNavigateToChannel={onNavigateToChannel} limit={3} />
          )}
`;

let newLayout = `
      {/* =============== MAIN VIEWPORT =============== */}
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Player & Episode Info */}
        <div className="w-full lg:w-[71%] flex flex-col min-w-0 pb-10">
` + playerChunk + `
          {/* =============== EPISODE INFO =============== */}
` + episodeInfoChunk + `
        </div>
        
        {/* RIGHT COLUMN: Up Next & More Like This */}
        <div className="w-full lg:w-[29%] flex flex-col gap-6 lg:sticky lg:top-[70px] lg:max-h-[calc(100vh-100px)] overflow-y-auto pr-2 custom-scrollbar pb-24">
` + upNextChunk.replace('        {/* =============== RIGHT COLUMN: INTEGRATED EPISODE QUEUE SIDEBAR =============== */}\n        <div className="w-full lg:w-[29%] flex flex-col gap-4 lg:sticky lg:top-[70px] lg:max-h-[calc(100vh-100px)] overflow-y-auto pr-2 lg:overflow-y-auto custom-scrollbar pb-24">', '        {/* =============== INTEGRATED EPISODE QUEUE SIDEBAR =============== */}\n        <div className="flex flex-col gap-4">') + `
` + moreLikeThisChunk + `
        </div>
`;

code = code.substring(0, startOfLayout) + newLayout.trimStart() + '\n' + code.substring(endOfThirdRow);
fs.writeFileSync('src/components/WatchPage.tsx', code);
console.log("Done");
