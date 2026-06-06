async function run() {
  const res = await fetch("https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json");
  const json = await res.json();
  console.log(JSON.stringify(json.slice(0, 5), null, 2));
}
run();
