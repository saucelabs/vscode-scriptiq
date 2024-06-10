import { useEffect, useRef } from 'react';

interface ScreenshotProps {
  src: string;
  width: number;
  height: number;
  annotation: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function Screenshot(props: ScreenshotProps) {
  const { annotation, src, width, height } = props;
  const ref = useRef<HTMLCanvasElement>(null);

  const imgRatio = width / height;
  const imgHeight = 350;
  const imgWidth = imgHeight * imgRatio;

  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context) {
      return;
    }
    const img = new Image();
    img.src = src;

    img.onload = () => {
      context.drawImage(img, 0, 0, imgWidth, imgHeight);

      context.strokeRect(0, 0, imgWidth, imgHeight);

      if (annotation) {
        context.lineWidth = 3;
        context.rect(
          annotation.x * imgWidth,
          annotation.y * imgHeight,
          annotation.width * imgWidth,
          annotation.height * imgHeight,
        );
        context.strokeStyle = '#EE805A';
        context.shadowColor = '#EE805A';
        context.stroke();
      }
    };
  }, [ref, annotation, src, imgWidth, imgHeight]);
  return <canvas ref={ref} width={imgWidth} height={imgHeight} />;
}
