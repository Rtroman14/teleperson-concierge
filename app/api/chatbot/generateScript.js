const generateStyles = ({ accentColor, accentColorHsl, textColor }) => {
    return `
      <style>
        #teleperson-iframe {
            // max-height: 800px;
            transform: scale(0);
            transform-origin: bottom right;
            opacity: 0;
            bottom: 20px;
            border: 0;
            position: fixed;
            right: 20px;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
            border-radius: 16px;
            transition: all 0.3s ease 0s;
            z-index: 999999;
        }
        #teleperson-chat-bubble-container {
            z-index: 999999;
            position: fixed;
            bottom: 20px;
            right: 20px;
        }
        #teleperson-chat-bubble {
            z-index: 999999;
            border-radius: 50%;
            padding: 10px;
            transition-duration: 100ms;
            animation-duration: 100ms;
            line-height: 0px;
            color: ${textColor};
            border: none;
            cursor: pointer;
            background-image: linear-gradient(135deg, hsl(${accentColorHsl.h}, ${accentColorHsl.s}%, 80%, 1), ${accentColor});
            &:hover {
                transform: scale(1.1);
            }
            &:active {
                transform: scale(1);
            }
        }
        #teleperson-chat-bubble svg {
            height: 30px;
            width: 30px;
        }
        #teleperson-welcome-message {
            display: none;
            position: absolute;
            bottom: 60px;
            right: 0;
            width: 300px;
            border-radius: 8px;
            padding: 12px;
            font-size: 14px;
            line-height: 20px;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
            cursor: pointer;
        }
        #teleperson-welcome-message p {
            margin: 0px;
            padding: 0px;
        }
        #teleperson-welcome-message-close-icon {
            display: none;
            position: absolute;
            right: 0;
            top: 0;
            z-index: 99999999999;
            line-height: 0px;
            height: auto;
            width: 20px;
            transform: translate(50%,-50%);
            border-radius: 99999px;
            padding: 2px;
            transition-duration: 100ms;
        }
        #teleperson-welcome-message:hover #teleperson-welcome-message-close-icon {
            display: block;
        }
        #teleperson-welcome-message-close-icon:hover {
            transform: translate(50%, -50%) scale(1.1);
        }
        #teleperson-teleperson-icon {
            height: 31px !important;
            width: 31px !important;
        }
      </style>`;
};

const chatbubbleCloseIcon = `
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
    </svg>`;

const chatbubbleLogoIcon = () => {
    return `
        <img id="teleperson-teleperson-icon" src="https://api.webagent.ai/storage/v1/object/public/logos/companys/teleperson-icon.png" width="31" height="31" alt="Chat Icon"/>`;
};

const chatBubbleElements = ({ welcomeMessage, chatbotLogo }) => {
    return `
    <div id="teleperson-chat-bubble-container">
        <div className="relative">
            <div id="teleperson-welcome-message">
                <p>${welcomeMessage}</p>

                <span id="teleperson-welcome-message-close-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </span>
            </div>

            <button id="teleperson-chat-bubble" aria-label="Chatbot Widget">${chatbotLogo}</button>
        </div>
    </div>
`;
};

module.exports = ({
    accentColor,
    accentColorHsl,
    textColor,
    darkTheme,
    showPopup,
    welcomeMessage,
}) => {
    const styles = generateStyles({ accentColor, accentColorHsl, textColor });
    const chatbotLogo = chatbubbleLogoIcon();

    const chatBubbleElement = chatBubbleElements({ welcomeMessage, chatbotLogo });

    return `
        (function() {
            const styles = \`${styles}\`;
            document.head.insertAdjacentHTML("beforeend", styles);

            const iframe = document.createElement('iframe');
            iframe.src = "http://localhost:3000/";
            // iframe.src = "https://teleperson.webagent.ai/";
            iframe.id = 'teleperson-iframe';
            iframe.title = 'Teleperson Concierge';

            const minWidth = "640";

            iframe.style.width = window.innerWidth < minWidth ? "100%" : "550px";
            iframe.style.right = window.innerWidth < minWidth ? "0px" : "20px";
            iframe.style.maxHeight = window.innerWidth < minWidth ? "100%" : "800px";

            let isOpen = false;

            document.body.appendChild(iframe);

            // Creating the chat bubble container
            const chatBubbleContainer = document.createElement('div');
            chatBubbleContainer.setAttribute('id', 'teleperson-chat-bubble-container');

            // Adding the chat bubble elements to the container
            chatBubbleContainer.innerHTML = \`${chatBubbleElement}\`;

            // Add the chat bubble container to the DOM
            document.body.appendChild(chatBubbleContainer)

            const chatBubble = document.getElementById('teleperson-chat-bubble');
            const welcomeMessage = document.getElementById('teleperson-welcome-message');
            const welcomeMessageCloseIcon = document.getElementById('teleperson-welcome-message-close-icon');

            if(\`${showPopup}\` === "true" && window.innerWidth > minWidth) {
                const welcomeMessageCloseClicked = sessionStorage.getItem('welcomeMessageCloseClicked');

                if (welcomeMessageCloseClicked === null || welcomeMessageCloseClicked === 'false') {
                    setTimeout(function() {
                        if(!isOpen) {
                            welcomeMessage.style.display = "block";
                        }
                    }, 3000);
                }

                welcomeMessageCloseIcon.addEventListener('click', function() {
                    welcomeMessage.style.display = "none";

                    sessionStorage.setItem('welcomeMessageCloseClicked', true);
                });
            }

            if(\`${darkTheme}\` === "true") {
                welcomeMessage.style.backgroundColor = "#334155";
                welcomeMessage.style.color = "#ffffff";
                welcomeMessageCloseIcon.style.backgroundColor = "#1e293b";
                welcomeMessageCloseIcon.style.fill = "#ffffff";

            } else {
                welcomeMessage.style.backgroundColor = "#ffffff";
                welcomeMessage.style.color = "#000000";
                welcomeMessageCloseIcon.style.backgroundColor = "#cbd5e1";
                welcomeMessageCloseIcon.style.fill = "#000000";
            }

            // Listen for screensize change
            window.addEventListener("resize", () => {
                iframe.style.width = window.innerWidth < minWidth ? "100%" : "550px";
                iframe.style.right = window.innerWidth < minWidth ? "0px" : "20px";
                iframe.style.maxHeight = window.innerWidth < minWidth ? "100%" : "800px";
            });

            window.addEventListener('message', (event) => {
                if (event.data === 'close-chatbot') {
                  // Close the iframe
                  isOpen = false;
                  iframe.style.opacity = "0";
                  iframe.style.transform = "scale(0)";
                  iframe.style.transformOrigin = "bottom right";
                  iframe.style.borderRadius ="16px";
                  chatBubble.style.display = "flex";

                  chatBubble.innerHTML = \`${chatbotLogo}\`;
                }
            });

            function showChatbot() {
                isOpen = true;
                iframe.style.opacity = "1";
                iframe.style.bottom = window.innerWidth < minWidth ? "0px" : "90px";
                iframe.style.height = window.innerWidth < minWidth ? "100%" : "85vh";
                iframe.style.width = window.innerWidth < minWidth ? "100%" : "550px";
                iframe.style.right = window.innerWidth < minWidth ? "0px" : "20px";
                iframe.style.transform = "scale(1)";
                iframe.style.borderRadius = window.innerWidth < minWidth ? "0px" : "16px";
                chatBubble.style.display = window.innerWidth < minWidth ? "none" : "flex";
                welcomeMessage.style.display = "none";

                chatBubble.innerHTML = \`${chatbubbleCloseIcon}\`;

                sessionStorage.setItem('welcomeMessageCloseClicked', true);
            };
            function hideChatbot() {
                isOpen = false;
                iframe.style.opacity = "0";
                iframe.style.transform = "scale(0)";
                iframe.style.transformOrigin = "bottom right";
                iframe.style.borderRadius ="16px";
                chatBubble.style.display = "flex";

                chatBubble.innerHTML = \`${chatbotLogo}\`;
            };


            chatBubble.addEventListener('click', function() {
                sessionStorage.setItem('chatbotClicked', true);

                if(isOpen) {
                    hideChatbot();
                } else {
                    showChatbot();
                }
            });

            welcomeMessage.addEventListener('click', function() {
                if (event.target.closest('#teleperson-welcome-message-close-icon') === null) {
                    sessionStorage.setItem('chatbotClicked', true);

                    if(isOpen) {
                        hideChatbot();
                    } else {
                        showChatbot();
                    }
                }
            });
        })();
    `;
};
