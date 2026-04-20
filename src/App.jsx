import React, { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Cloud,
  Database,
  ExternalLink,
  FileText,
  Folder,
  History,
  Layout,
  MoreVertical,
  Plus,
  Search,
  Send,
  Settings,
  X,
} from 'lucide-react'

const App = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      content:
        '안녕하세요! 구글 드라이브의 자료를 바탕으로 답변해드리는 어시스턴트입니다. 어떤 문서를 찾아드릴까요?',
      timestamp: '오전 10:00',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [isDriveConnected] = useState(true)
  const [selectedDocs] = useState([
    { name: '2024 마케팅 전략.pdf', type: 'pdf' },
    { name: 'Q3 프로젝트 일정표.gsheet', type: 'sheet' },
  ])

  const canSend = useMemo(() => inputText.trim().length > 0, [inputText])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!canSend) return

    const prompt = inputText.trim()
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    setMessages((prev) => [...prev, newUserMessage])
    setInputText('')

    window.setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        role: 'ai',
        content: `찾으신 드라이브 문서에 따르면, '${prompt}'에 대한 내용은 2024 마케팅 전략 문서의 12페이지에 설명되어 있습니다. 해당 부분은 예산 효율화에 집중하고 있네요.`,
        source: '2024 마케팅 전략.pdf',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out`}
      >
        <div className="p-4 flex items-center justify-between">
          <div
            className={`flex items-center gap-3 transition-opacity ${
              !isSidebarOpen && 'opacity-0 hidden'
            }`}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Cloud size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight">DriveChat</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
            aria-label="Toggle sidebar"
            type="button"
          >
            <Layout size={20} />
          </button>
        </div>

        <div className="p-4">
          <button
            className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors shadow-sm ${
              !isSidebarOpen && 'p-0 h-10'
            }`}
            type="button"
          >
            <Plus size={20} />
            {isSidebarOpen && <span>새 대화 시작</span>}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <div className="py-2">
            {isSidebarOpen && (
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                최근 대화
              </p>
            )}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 bg-slate-100 text-blue-600 rounded-lg font-medium text-sm"
              type="button"
            >
              <History size={18} />
              {isSidebarOpen && <span className="truncate">마케팅 전략 분석</span>}
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm"
              type="button"
            >
              <History size={18} />
              {isSidebarOpen && (
                <span className="truncate">연간 예산 보고서 요약</span>
              )}
            </button>
          </div>

          <div className="py-2 border-t border-slate-100 mt-2">
            {isSidebarOpen && (
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                연결된 폴더
              </p>
            )}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm"
              type="button"
            >
              <Folder size={18} className="text-amber-500" />
              {isSidebarOpen && <span className="truncate">2024 프로젝트</span>}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          {isDriveConnected ? (
            <div
              className={`flex items-center gap-3 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs ${
                !isSidebarOpen && 'justify-center px-0'
              }`}
            >
              <CheckCircle2 size={16} />
              {isSidebarOpen && <span>구글 드라이브 연결됨</span>}
            </div>
          ) : (
            <button
              className="w-full flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium"
              type="button"
            >
              <Cloud size={16} />
              {isSidebarOpen && <span>드라이브 연결하기</span>}
            </button>
          )}
          <button
            className={`w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm transition-colors ${
              !isSidebarOpen && 'justify-center'
            }`}
            type="button"
          >
            <Settings size={18} />
            {isSidebarOpen && <span>설정</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-800">마케팅 전략 분석</h2>
            <div className="h-4 w-[1px] bg-slate-300"></div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-md no-scrollbar">
              {selectedDocs.map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-[12px] text-slate-600 whitespace-nowrap"
                >
                  <FileText size={12} className="text-blue-500" />
                  <span>{doc.name}</span>
                  <X
                    size={12}
                    className="cursor-pointer hover:text-red-500"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              type="button"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              JD
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                  }`}
                >
                  {msg.content}

                  {msg.source && (
                    <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center gap-2 text-xs font-medium text-blue-600">
                      <Database size={12} />
                      출처:{' '}
                      <span className="underline cursor-pointer flex items-center gap-1">
                        {msg.source} <ExternalLink size={10} />
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5 px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-white via-white to-transparent">
          <form
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto relative group"
          >
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="연결된 드라이브 문서에 대해 무엇이든 물어보세요..."
              className="w-full pl-12 pr-14 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 transition-all shadow-lg shadow-slate-100/50 text-sm"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="absolute right-3 inset-y-3 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl transition-all flex items-center justify-center shadow-sm"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-center text-[11px] text-slate-400 mt-3">
            AI는 드라이브의 내용을 바탕으로 정보를 생성하며, 간혹 오류가 발생할 수 있습니다.
          </p>
        </div>
      </main>

      {/* Resource Panel (Preview) */}
      <aside className="w-80 bg-slate-50 border-l border-slate-200 hidden xl:flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <h3 className="font-semibold text-sm">참조된 리소스</h3>
          <button
            className="text-slate-400 hover:text-slate-600"
            type="button"
            aria-label="More"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-800">
                  2024 마케팅 전략.pdf
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  최종 수정: 2024.03.15
                </p>
              </div>
            </div>
            <div className="mt-3 text-[12px] text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2 rounded-lg">
              "올해 2분기 예산안은 전년 대비 15% 증액되었으며, 특히 디지털 광고 부문에 집중적인..."
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-blue-600 font-medium">드라이브에서 열기</span>
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-800">
                  Q3 프로젝트 일정표.gsheet
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  최종 수정: 2024.04.01
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-blue-600 font-medium">드라이브에서 열기</span>
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default App
