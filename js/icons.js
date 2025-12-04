const universeIds = [
    {
        id: 4342047058,
        nameOf: "Guts & Blackpowder",
        desc: "I've handled programming, game design, models, and the UI for this game. It's my favorite game ever.",
        url: "https://www.roblox.com/games/12334109280/",
    },
    {
        id: 3813107352,
        nameOf: "Bombline",
        desc: "I've assisted in programming during the pre-alpha phase of this game, and also contributed heavily towards the game's style.",
        url: "https://www.roblox.com/games/10469988463/",
    },
    {
        id: 7264587281,
        nameOf: "Sniper Duels",
        desc: "I'm an investor for this game.",
        url: "https://www.roblox.com/games/109397169461300/",
    },
]

const previouslyWorkedOn = [
    {
        id: 2197843077,
        nameOf: "Brickbattle Brawl",
        desc: "This was my first serious game project ever. While its age does show, it's still something I'm proud of.",
        url: "https://www.roblox.com/games/6061920912/",
    },
    {
        id: 865128420,
        nameOf: "Kiseki CTF+",
        desc: "This was my second serious game project. It's based off of clockwork and conix's game of the same name (although it's called CTF instead of CTF+).",
        url: "https://www.roblox.com/games/2451668070/",
    },
    {
        id: 1955709044,
        nameOf: "The Undead Coming",
        desc: "This was my first big project that I've done on behalf of someone else. While in hindsight the project was a mess, it's still my baby.",
        url: "https://www.roblox.com/games/5596726628/",
    },
    {
        id: 3192586864,
        nameOf: "Untitled Fight Game",
        desc: "After The Undead Coming, I decided to work on this game. It's a simple sandbox melee combat game.",
        url: "https://www.roblox.com/games/8343174537/",
    },
]

const container = document.getElementById('gallery-container-main');
const container2 = document.getElementById('gallery-container-old');
const infoBox = document.getElementById('infobox');
const descBox = document.getElementById('desc');
const titleBox = document.getElementById('title');
const iconBox = document.getElementById('gameicon');
const closeButton = document.getElementById('closebutton');
const linkButton = document.getElementById('link');

async function fetchGameIconUrl(universeId, universeName, description, gameUrl) {
    const url = `https://thumbnails.roproxy.com/v1/games/icons?universeIds=${universeId}&size=420x420&format=Png&isCircular=false`;

    try {
        const response = await fetch(url);

        if (!response.ok) throw new Error(`Http error: ${response.status}`);

        const data = await response.json();
        if (data && data.data && data.data.length > 0 && data.data[0].imageUrl) {
            return {
                url: data.data[0].imageUrl,
                nameOf: universeName,
                desc: description,
                gameUrl: gameUrl,
            };
        }
        console.warn(`No icon found for Universe ID: ${universeId}`);
        return null;
    } catch (error) {
        console.error(`Error fetching icons for universe ID ${universeId}:`, error);
        return null;
    }
}

async function displayIcons() {
    for (const universeData of universeIds) {
        const imageUrl = await fetchGameIconUrl(universeData.id, universeData.nameOf, universeData.desc, universeData.url);

        if (imageUrl) {
            const innerGallery = document.createElement("div");
            innerGallery.className = "responsive-gallery";

            const gallery = document.createElement("div");
            gallery.className = "gallery";

            const desc = document.createElement("div");
            desc.className = "desc";
            desc.textContent = imageUrl.nameOf;

            const imgElement = document.createElement("img");
            imgElement.src = imageUrl.url;
            imgElement.className = 'img-border';
            imgElement.style.width = '150px';
            imgElement.style.height = '150px';
            imgElement.addEventListener('click', function () {
                iconBox.src = imageUrl.url;
                descBox.textContent = imageUrl.desc;
                titleBox.textContent = imageUrl.nameOf;
                linkButton.href = imageUrl.gameUrl;
                infoBox.style.display = 'flex';
            })
            gallery.appendChild(imgElement);
            gallery.appendChild(desc);
            innerGallery.appendChild(gallery);
            container.appendChild(innerGallery);
        }
    }
    for (const universeData of previouslyWorkedOn) {
        const imageUrl = await fetchGameIconUrl(universeData.id, universeData.nameOf, universeData.desc, universeData.url);

        if (imageUrl) {
            const innerGallery = document.createElement("div");
            innerGallery.className = "responsive-gallery";

            const gallery = document.createElement("div");
            gallery.className = "gallery";

            const desc = document.createElement("div");
            desc.className = "desc";
            desc.textContent = imageUrl.nameOf;

            const imgElement = document.createElement("img");
            imgElement.src = imageUrl.url;
            imgElement.className = 'img-border';
            imgElement.style.width = '150px';
            imgElement.style.height = '150px';
            imgElement.addEventListener('click', function () {
                iconBox.src = imageUrl.url;
                descBox.textContent = imageUrl.desc;
                titleBox.textContent = imageUrl.nameOf;
                linkButton.href = imageUrl.gameUrl;
                infoBox.style.display = 'flex';
            })

            gallery.appendChild(imgElement);
            gallery.appendChild(desc);
            innerGallery.appendChild(gallery);
            container2.appendChild(innerGallery);
        }
    }
}

closeButton.addEventListener('click', function () {
    infoBox.style.display = 'none';
})
displayIcons();