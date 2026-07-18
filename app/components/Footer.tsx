'use client'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <span className="text-green-500">●</span> 
            Available for projects
          </span>
          <span className="hidden sm:inline">|</span>
          <span>⏱️ 24hr response</span>
        </div>
        
        <div className="flex items-center gap-4">
          <a
            href="mailto:mdsislammaruf@gmail.com"
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            📧 Email Me
          </a>
          <a
            href="https://www.linkedin.com/in/sharifulislammaruf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-[#0077B5] transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/your-profile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
      
      <div className="mt-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Insurance SaaS Demo • Built with Next.js, Supabase & n8n
      </div>
    </footer>
  )
}