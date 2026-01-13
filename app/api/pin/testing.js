const baseUrl = "http://localhost:3000";

async function run() {
    const pin = "874530";

    // POST
    const post = await fetch(`${baseUrl}/api/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
    });

    console.log("POST status:", post.status);
    console.log("POST body:", await post.json());

    // cookie
    const setCookie = post.headers.get("set-cookie");
    console.log("Set-Cookie:", setCookie);

    // GET (reenviando cookie)
    const get = await fetch(`${baseUrl}/api/pin`, {
        method: "GET",
        headers: setCookie ? { cookie: setCookie.split(";")[0] } : {},
    });

    console.log("GET status:", get.status);
    console.log("GET body:", await get.json());


}

run().catch(console.error);
