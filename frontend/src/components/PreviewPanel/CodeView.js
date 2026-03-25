import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Copy, Check } from 'lucide-react';
import { Button } from '../ui/button';

export function CodeView({ preview }) {
  const [copied, setCopied] = React.useState(null);

  const copyToClipboard = async (code, type) => {
    await navigator.clipboard.writeText(code);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ code, language, type }) => (
    <div className="relative h-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => copyToClipboard(code, type)}
        className="absolute top-2 right-2 z-10 text-[#6A6A75] hover:text-[#EDEDED] hover:bg-[#1A1A20]"
      >
        {copied === type ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
      <ScrollArea className="h-full">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '16px',
            background: '#0A0A0A',
            fontSize: '13px',
            lineHeight: '1.6',
            height: '100%',
            minHeight: '300px',
          }}
          showLineNumbers
          lineNumberStyle={{
            color: '#6A6A75',
            paddingRight: '16px',
          }}
        >
          {code || `// No ${language} code yet`}
        </SyntaxHighlighter>
      </ScrollArea>
    </div>
  );

  return (
    <div 
      data-testid="code-view-container"
      className="flex-1 bg-[#0A0A0A] overflow-hidden"
    >
      <Tabs defaultValue="html" className="h-full flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-[#22222A] bg-[#111115] p-0 h-auto">
          <TabsTrigger 
            value="html"
            data-testid="code-tab-html"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#19AFFF] data-[state=active]:bg-transparent data-[state=active]:text-[#EDEDED] text-[#6A6A75] px-4 py-2"
          >
            HTML
          </TabsTrigger>
          <TabsTrigger 
            value="css"
            data-testid="code-tab-css"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#19AFFF] data-[state=active]:bg-transparent data-[state=active]:text-[#EDEDED] text-[#6A6A75] px-4 py-2"
          >
            CSS
          </TabsTrigger>
          <TabsTrigger 
            value="js"
            data-testid="code-tab-js"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#19AFFF] data-[state=active]:bg-transparent data-[state=active]:text-[#EDEDED] text-[#6A6A75] px-4 py-2"
          >
            JavaScript
          </TabsTrigger>
        </TabsList>
        <TabsContent value="html" className="flex-1 m-0 overflow-hidden">
          <CodeBlock code={preview.html} language="html" type="html" />
        </TabsContent>
        <TabsContent value="css" className="flex-1 m-0 overflow-hidden">
          <CodeBlock code={preview.css} language="css" type="css" />
        </TabsContent>
        <TabsContent value="js" className="flex-1 m-0 overflow-hidden">
          <CodeBlock code={preview.js} language="javascript" type="js" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CodeView;
