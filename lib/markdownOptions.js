const ATagTargetBlank = ({ children, ...props }) => (
    <a {...props} target="_blank">
        {children}
    </a>
);

export const markdownOptions = {
    overrides: {
        h1: {
            props: {
                className: "text-2xl font-bold mb-1 mt-4",
            },
        },
        h2: {
            props: {
                className: "text-xl font-bold mb-1 mt-4",
            },
        },
        h3: {
            props: {
                className: "text-xl font-bold mb-1 mt-4",
            },
        },
        h4: {
            props: {
                className: "font-bold mb-0.5",
            },
        },
        ul: {
            props: {
                className: "markdown-ul space-y-1 py-1",
            },
        },
        ol: {
            props: {
                className: "markdown-ol space-y-1 py-1",
            },
        },
        a: {
            component: ATagTargetBlank,
            props: {
                className: "text-blue-500 underline",
            },
        },
    },
};
