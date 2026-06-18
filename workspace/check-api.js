async function test() {
  const req = await fetch("https://anivexa-api-nine.vercel.app/watch/anineko/108632/sub/anineko-1");
  const data = await req.json();
  console.log(JSON.stringify(data).slice(0, 300));
}
test();
