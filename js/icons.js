
document.addEventListener("infobox:open", (e) => {
    const universeIds = [
        {
            id: 4342047058,
            nameOf: "Guts & Blackpowder",
            desc: "I'm the secondary programmer & game designer for Guts & Blackpowder. It's honestly one of my favorite projects of all time. It really taught me a lot about game design.",
            url: "https://www.roblox.com/games/12334109280/",
            altImageIcon: "https://pulsekinesis.com/images/logo.png",
        },
        {
            id: 3813107352,
            nameOf: "Bombline",
            desc: "I've assisted in programming during the pre-alpha phase of this game, and also contributed heavily towards the game's style. Specifically with the character skins.",
            url: "https://www.roblox.com/games/10469988463/",
            altImageIcon: "https://pulsekinesis.com/images/logo.png",
        },
        {
            id: 7264587281,
            nameOf: "Sniper Duels",
            desc: "I'm an investor for this game. Although I didn't handle any of the game's programming (besides one or two lines of code), I still supported my friend throughout this time.",
            url: "https://www.roblox.com/games/109397169461300/",
            altImageIcon: "https://pulsekinesis.com/images/logo.png",
        },
    ]

    const previouslyWorkedOn = [
        {
            id: 2197843077,
            nameOf: "Brickbattle Brawl",
            desc: "This was my first serious game project. While its age does show, it's still something I'm proud of. As I programmed everything from scratch.",
            url: "https://www.roblox.com/games/6061920912/",
            altImageIcon: "https://pulsekinesis.com/images/logo.png",
        },
        {
            id: 865128420,
            nameOf: "Kiseki CTF+",
            desc: "This was my second serious game project. It's based off of clockwork and conix's game of the same name. This game was, unfortunately, never fully released to the public.",
            url: "https://www.roblox.com/games/2451668070/",
            altImageIcon: "https://pulsekinesis.com/images/logo.png",
        },
        {
            id: 1955709044,
            nameOf: "The Undead Coming (2021)",
            desc: "This was my first big game project. While in hindsight the project was a mess, it still taught me a lot about game development. Luckily a friend of mine by the name of \"Large\" made a working version. Please check out the 2026 version!",
            url: "https://www.roblox.com/games/5596726628/",
            altImageIcon: "https://pulsekinesis.com/images/logo.png",
        },
        {
            id: 3192586864,
            nameOf: "Untitled Fight Game",
            desc: "After The Undead Coming, I helped work on this game. It's a simple sandbox melee combat game that was fun to play around in.",
            url: "https://www.roblox.com/games/8343174537/",
            altImageIcon: "https://pulsekinesis.com/images/logo.png",
        },
        {
            id: -1,
            nameOf: "X View Images",
            desc: "Back in the day, there was this Chrome extension someone made that allowed users to download the original image of a given X post. I've decided to release a functional version.",
            url: "https://github.com/pulsekinesis/X-View-Original-Images",
            altImageIcon: "https://pulsekinesis.com/images/x_img_logo.png",
        }
    ]

    const container = document.getElementById('gallery-container-main');
    const container2 = document.getElementById('gallery-container-old');
    const infoBox = document.getElementById('infobox');
    const descBox = document.getElementById('desc');
    const titleBox = document.getElementById('title');
    const iconBox = document.getElementById('gameicon');
    const closeButton = document.getElementById('closebutton');
    const linkButton = document.getElementById('link');

    if (container == null) return;

    async function fetchGameIconUrl(universeId, universeName, description, gameUrl, altImageIcon) {
        const url = `https://thumbnails.roproxy.com/v1/games/icons?universeIds=${universeId}&size=420x420&format=Png&isCircular=false`;

        try {
            if (universeId == -1) {
                return {
                    url: altImageIcon,
                    nameOf: universeName,
                    desc: description,
                    gameUrl: gameUrl,
                    isAltUrl: true,
                };
            }
            const response = await fetch(url);

            if (!response.ok) throw new Error(`Http error: ${response.status}`);

            const data = await response.json();
            if (data && data.data && data.data.length > 0 && data.data[0].imageUrl) {
                return {
                    url: data.data[0].imageUrl,
                    nameOf: universeName,
                    desc: description,
                    gameUrl: gameUrl,
                    isAltUrl: false,
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
        var count = 0;

        for (const universeData of universeIds) {
            const imageUrl = await fetchGameIconUrl(universeData.id, universeData.nameOf, universeData.desc, universeData.url, universeData.altImageIcon);

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
                imgElement.style.width = '100px';
                imgElement.style.height = '100px';
                imgElement.addEventListener('click', function () {
                    iconBox.src = imageUrl.url;
                    descBox.textContent = imageUrl.desc;
                    titleBox.textContent = imageUrl.nameOf;
                    linkButton.href = imageUrl.gameUrl;
                    infoBox.style.display = 'flex';
                    if (imageUrl.isAltUrl) {
                        linkButton.textContent = "Open Url"
                    } else { linkButton.textContent = "Open Game" }
                })

                gallery.appendChild(imgElement);
                gallery.appendChild(desc);
                innerGallery.appendChild(gallery);
                container.appendChild(innerGallery);

                if (universeIds.length > 4) {
                    count += 1;
                    if (count > 4) {
                        innerGallery.classList.add("extended");
                    }
                }
            }
        }

        count = 0;

        for (const universeData of previouslyWorkedOn) {
            const imageUrl = await fetchGameIconUrl(universeData.id, universeData.nameOf, universeData.desc, universeData.url, universeData.altImageIcon);

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
                imgElement.style.width = '100px';
                imgElement.style.height = '100px';
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

                
                if (previouslyWorkedOn.length > 4) {
                    count += 1;
                    if (count > 4) {
                        innerGallery.classList.add("extended");
                    }
                }
            }
        }
    }

    closeButton.addEventListener('click', function () {
        infoBox.style.display = 'none';
    })

    linkButton.addEventListener('click', function () {
        infoBox.style.display = 'none';
    })

    displayIcons();
});

