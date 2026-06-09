const fs = require('fs');
let code = fs.readFileSync('src/components/WatchPage.tsx', 'utf-8');

const layoutStartIdx = code.indexOf('{/* =============== MAIN TWO-COLUMN VIEWPORT LISTS =============== */}');
if (layoutStartIdx === -1) {
  console.log("Could not find layout start");
  process.exit(1);
}

const playerNavEndStr = '          </div>\n\n          {/* Episode Info */}';
const playerNavEndIdx = code.indexOf(playerNavEndStr);

const rightColumnStartStr = '        {/* =============== RIGHT COLUMN: INTEGRATED EPISODE QUEUE SIDEBAR =============== */}';
const rightColumnStartIdx = code.indexOf(rightColumnStartStr);

const episodeInfoContentRaw = code.substring(playerNavEndIdx + '          </div>\n\n'.length, rightColumnStartIdx);

const recomStartStr = '          {/* Recommendations Component */}';
const recomStartIdx = code.indexOf(recomStartStr);

const rightColumnContentRaw = code.substring(rightColumnStartIdx, recomStartIdx);

let newStructure = `
      {/* =============== MAIN VIEWPORT =============== */}
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 py-6 flex flex-col gap-8">
        
        {/* ROW 1: Player & Up Next */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Player */}
          <div className="w-full lg:w-[71%] flex flex-col min-w-0">
` + code.substring(layoutStartIdx + '{/* =============== MAIN TWO-COLUMN VIEWPORT LISTS =============== */}\n      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">\n        \n        {/* LEFT COLUMN: Player, Details, and Info Panels */}\n        <div className="w-full lg:w-[71%] flex flex-col min-w-0">'.length, playerNavEndIdx + '          </div>\n'.length) + `
          </div>
          
          {/* RIGHT: Up Next */}
` + rightColumnContentRaw.replace(/lg:h-\[calc\(100vh-100px\)\]/, 'lg:max-h-[calc(100vh-100px)] overflow-y-auto').replace(/w-full lg:w-\[29%\] flex flex-col gap-4/, 'w-full lg:w-[29%] flex flex-col gap-4') + `
        </div>

        {/* ROW 2: Episode Info (Full Width) */}
        <div className="w-full flex flex-col gap-4 pb-4">
` + episodeInfoContentRaw.replace('        </div>\n\n', '').replace('          </div>\n', '') + `
          </div>

        {/* ROW 3: More Like This (Full Width) */}
        <div className="w-full">
` + code.substring(recomStartIdx, code.indexOf('      </div>\n    </div>', recomStartIdx)) + `
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/WatchPage.tsx', code.substring(0, layoutStartIdx) + newStructure.trimStart() + '\n');
console.log("Done");
