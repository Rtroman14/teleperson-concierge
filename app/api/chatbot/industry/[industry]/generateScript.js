module.exports = ({ industry }) => {
    const iframeSrc = `https://teleperson.webagent.ai/industry/${industry}`;
    // const iframeSrc = `http://localhost:3000/industry/${industry}`;

    // Only generate the iframe and inject it into #chatbot-container
    return `
        (function() {
            const container = document.getElementById('chatbot-container');
            if (!container) return;

            const iframe = document.createElement('iframe');
            iframe.src = \`${iframeSrc}\`;

            iframe.id = 'teleperson-iframe';
            iframe.title = 'Teleperson Concierge';
            iframe.allow = "microphone *";
            iframe.style.borderRadius = "14px";
            iframe.style.border = "none";
            iframe.style.boxShadow = "0 25px 50px -12px rgb(0 0 0 / 0.25)";
            container.appendChild(iframe);
        })();
    `;
};
