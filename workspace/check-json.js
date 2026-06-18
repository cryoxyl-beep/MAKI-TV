async function test() {
  const req = await fetch("https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json");
  const data = await req.json();
  console.log(data.filter(opt => {
     if (typeof opt.themoviedb_id === "object") return opt.themoviedb_id?.tv === 65942;
     return opt.themoviedb_id === 65942;
  }));
}
test();
