const fs = require('fs');

// We will checkout the original file first if possible, or just string replace manually since we know the issues.
// But we don't have git history for just one file easily if it's untracked. Wait, it is in git.
