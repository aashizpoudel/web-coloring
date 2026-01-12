/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,html}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Quicksand', 'sans-serif'],
                display: ['Fredoka', 'cursive'],
            },
        },
    },
    plugins: [],
}
