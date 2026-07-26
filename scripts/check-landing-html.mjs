import http from "node:http";

http.get("http://localhost:3006/landing?v=punch4", (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => {
    const frames = [...d.matchAll(/landing\/mockups\/[^\"'\s>]+/g)].map(
      (m) => m[0],
    );
    console.log("frames", frames);
    console.log("has zIndex style", d.includes("zIndex") || d.includes("z-index: 10"));
    console.log("screen style top", /5\.7%/.test(d), /9\.6%/.test(d));
  });
});
