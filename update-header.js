const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// We will add MoreVertical to the lucide-react imports
content = content.replace(/import \{ Search, X, ArrowLeft, Home, Clapperboard, History, LogOut, Menu, Users \} from "lucide-react";/, 
  'import { Search, X, ArrowLeft, Home, Clapperboard, History, LogOut, Menu, Users, MoreVertical } from "lucide-react";');

// Remove Boxd Collaborative from both places (lines 269-282, 375-388)
// and replace with a Three Dots menu dropdown.

// Add state for the Three Dots dropdown
content = content.replace(/const \[showMobileSearch, setShowMobileSearch\] = useState\(false\);/,
  `const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);`);

fs.writeFileSync('src/components/Header.tsx', content);
