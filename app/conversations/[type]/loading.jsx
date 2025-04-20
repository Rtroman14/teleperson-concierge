export default function Loading() {
    return (
        <div className="flex grow">
            <div className="h-[calc(100vh-64px)] w-[400px] border border-border border-r-border bg-card p-2">
                {[...Array(15).keys()].map((el) => (
                    <div
                        key={el}
                        className="mb-2 w-full animate-pulse cursor-pointer rounded-lg border border-transparent px-2 py-3 hover:border-blue-600 hover:bg-blue-50"
                    >
                        <div className="flex items-center space-x-4">
                            <div>
                                <svg
                                    className="h-10 w-10 text-gray-200"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                        <div className="mb-2.5 h-2.5 w-20 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        <div className="h-1.5 w-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                                    </div>
                                </div>

                                <div className="truncate text-start text-sm text-gray-500 dark:text-gray-400">
                                    <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className=" h-[calc(100vh-64px)] w-full"></div>
        </div>
    );
}
