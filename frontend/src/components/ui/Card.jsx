import { classNames } from '../../utils/classNames';

export default function Card({ className, children }) {
  return (
    <section
      className={classNames(
        'rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-6 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)]',
        className,
      )}
    >
      {children}
    </section>
  );
}
