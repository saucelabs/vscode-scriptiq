import { useEffect, useRef } from 'react';

interface PreviewProps {
  credentials: { username: string; accessKey: string; region: string };

  sessionId: string;
}

export function Preview(props: PreviewProps) {
  const { credentials, sessionId } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const ws = useRef<WebSocket>();

  useEffect(() => {
    ws.current = new WebSocket(
      `wss://${credentials.username}:${credentials.accessKey}@api.${credentials.region}.saucelabs.com/v1/rdc/socket/alternativeIo/${sessionId}`,
    );
    ws.current.onerror = (err) => {
      console.log('Websocket Error: ', err);
    };

    ws.current.onmessage = (event: { data: unknown }) => {
      const { data } = event;
      if (!(data instanceof Blob)) {
        return;
      }
      const blob = new Blob([data], { type: 'image/jpeg' });

      const context = canvas.current?.getContext('2d');
      const img = new Image();
      img.src = window.URL.createObjectURL(blob);
      img.onload = () => {
        if (!canvas.current) {
          return;
        }
        const height = 500;
        const width = (500 * img.width) / img.height;
        canvas.current.height = height;
        canvas.current.width = width;
        context?.drawImage(img, 0, 0, width, height);
        context?.strokeRect(0, 0, width, height);
      };
      ws.current?.send('n/');
    };

    return () => {
      ws.current?.close();
    };
  }, [canvas, ws, credentials, sessionId]);
  return <canvas ref={canvas} />;
}
