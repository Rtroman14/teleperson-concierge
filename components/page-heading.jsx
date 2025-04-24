export default function PageHeading({ title, subheading }) {
    return (
        <div className="py-9">
            <h1 className="pb-2 text-center text-4xl font-semibold leading-none tracking-tight text-foreground-title antialiased lg:text-5xl">
                {title}
            </h1>
            <p className="text-center text-sm text-muted-foreground">{subheading}</p>
        </div>
    );
}
