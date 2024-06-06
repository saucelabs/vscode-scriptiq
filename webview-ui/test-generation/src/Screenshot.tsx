import { useEffect, useRef } from 'react';

interface ScreenshotProps {
  src: string;
  width: number;
  height: number;
}

export function Screenshot(props: ScreenshotProps) {
  console.log(props);
  const { src, width, height } = props;
  const ref = useRef<HTMLCanvasElement>(null);

  const imgRatio = width / height;
  const imgHeight = 350;
  const imgWidth = imgHeight * imgRatio;

  useEffect(() => {
    const context = ref.current?.getContext('2d');
    const img = new Image();
    img.src = src;

    img.onload = () => {
      context?.drawImage(img, 0, 0, imgWidth, imgHeight);
    };
  }, [ref, src]);
  return <canvas ref={ref} width={imgWidth} height={imgHeight} />;
}
