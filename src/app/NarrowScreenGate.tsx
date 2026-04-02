import { useEffect, useState, type ReactNode } from "react";
import { Typography } from "antd";

const { Title, Paragraph } = Typography;

/** Минимальная ширина для полноценной работы (планшеты и десктоп). Телефоны уже. */
export const MIN_VIEWPORT_WIDTH_PX = 768;

function useViewportWideEnough(minWidth: number) {
  const [ok, setOk] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setOk(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);

  return ok;
}

export function NarrowScreenGate({ children }: { children: ReactNode }) {
  const ok = useViewportWideEnough(MIN_VIEWPORT_WIDTH_PX);

  if (ok) {
    return <>{children}</>;
  }

  return (
    <div className="narrow-viewport-block" role="dialog" aria-modal="true" aria-labelledby="narrow-screen-title">
      <div className="narrow-viewport-block__inner">
        <Title level={3} id="narrow-screen-title" className="narrow-viewport-block__title">
          Нужен планшет или компьютер
        </Title>
        <Paragraph className="narrow-viewport-block__text">
          Редактор Blockly и рабочая область рассчитаны на экран не уже <strong>{MIN_VIEWPORT_WIDTH_PX}px</strong>.
          Откройте сайт на планшете (альбомная ориентация или экран от 10&quot;) или на компьютере.
        </Paragraph>
        <Paragraph type="secondary" className="narrow-viewport-block__hint">
          Если у вас уже планшет, попробуйте повернуть его или увеличить окно браузера.
        </Paragraph>
      </div>
    </div>
  );
}
