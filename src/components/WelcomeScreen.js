export const WelcomeScreen = (onSelectImage, coloringPages = []) => {
    const container = document.createElement('div');
    container.className = "flex flex-col items-center justify-center min-h-screen p-4 space-y-8 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 relative fade-in";

    // Decorative blobs
    container.innerHTML = `
        <div class="absolute top-20 left-20 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
        <div class="absolute bottom-20 right-20 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style="animation-delay: 1s;"></div>
        <div class="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style="animation-delay: 2s;"></div>
    `;

    // Content Card
    const card = document.createElement('div');
    card.className = "relative z-10 w-full max-w-3xl p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 text-center";

    // Title
    const title = document.createElement('h1');
    title.className = "text-4xl font-bold text-stone-800 mb-2";
    title.innerText = "🎨 Coloring Book";

    const subtitle = document.createElement('p');
    subtitle.className = "text-stone-600 mb-8";
    subtitle.innerText = "Choose a coloring page to start creating!";

    // Gallery Section
    const gallerySection = document.createElement('div');
    gallerySection.className = "mb-8";

    const galleryTitle = document.createElement('h2');
    galleryTitle.className = "text-sm font-bold text-stone-400 uppercase tracking-widest mb-4";
    galleryTitle.innerText = "Select a Coloring Page";

    const gallery = document.createElement('div');
    gallery.className = "grid grid-cols-2 md:grid-cols-4 gap-4";

    coloringPages.forEach(page => {
        const item = document.createElement('button');
        item.className = "group relative aspect-square rounded-2xl overflow-hidden border-2 border-stone-200 hover:border-orange-400 hover:shadow-lg transition-all hover:scale-[1.02]";
        item.innerHTML = `
            <img src="${page.src}" alt="${page.name}" class="w-full h-full object-cover bg-white" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                <span class="text-white font-bold text-sm">${page.name}</span>
            </div>
        `;
        item.onclick = () => onSelectImage(page.src);
        gallery.appendChild(item);
    });

    gallerySection.appendChild(galleryTitle);
    gallerySection.appendChild(gallery);

    // Divider
    const divider = document.createElement('div');
    divider.className = "flex items-center gap-3 my-6";
    divider.innerHTML = `
        <div class="flex-1 h-px bg-stone-200"></div>
        <span class="text-xs text-stone-400 uppercase tracking-widest">or</span>
        <div class="flex-1 h-px bg-stone-200"></div>
    `;

    // Upload Section
    const uploadSection = document.createElement('div');
    uploadSection.className = "space-y-3";

    const uploadTitle = document.createElement('h2');
    uploadTitle.className = "text-sm font-bold text-stone-400 uppercase tracking-widest mb-3";
    uploadTitle.innerText = "Upload Your Own";

    // File Input (Hidden)
    const fileInput = document.createElement('input');
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.className = "hidden";
    fileInput.id = "custom-file-input";

    const uploadButton = document.createElement('button');
    uploadButton.className = "w-full py-4 px-6 bg-gradient-to-r from-stone-100 to-stone-200 rounded-xl text-stone-700 font-bold text-lg border-2 border-dashed border-stone-300 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center justify-center gap-2";
    uploadButton.innerHTML = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        Upload Custom Line Art
    `;

    uploadButton.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                onSelectImage(ev.target.result);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    uploadSection.appendChild(uploadTitle);
    uploadSection.appendChild(fileInput);
    uploadSection.appendChild(uploadButton);

    // Footer hint
    const hint = document.createElement('p');
    hint.className = "text-xs text-stone-400 mt-6";
    hint.innerText = "Tip: Use black & white line art images for best results!";

    // Assemble
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(gallerySection);
    card.appendChild(divider);
    card.appendChild(uploadSection);
    card.appendChild(hint);

    container.appendChild(card);

    return container;
};
