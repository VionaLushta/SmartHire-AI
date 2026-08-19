import { classNames } from '../../utils/classNames';

export default function Card({ className, children }) {
  return (
    <section
      className={classNames(
        'rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      {children}
    </section>
  );
}
