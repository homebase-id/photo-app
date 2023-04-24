import LoadingParagraph from '../../ui/Layout/Loaders/LoadingParagraph/LoadingParagraph';

// Input on the "scaled" layout: https://github.com/xieranmaya/blog/issues/6
const gridClasses = `grid grid-cols-4 gap-1 md:grid-cols-6 lg:flex lg:flex-row lg:flex-wrap`;
const divClasses = `relative aspect-square lg:aspect-auto lg:h-[200px] lg:flex-grow overflow-hidden`;
const imgWrapperClasses = `h-full w-full object-cover lg:h-[200px] lg:min-w-full lg:max-w-xs lg:align-bottom`;

export const PhotoLibraryLoader = ({ className }: { className?: string }) => {
  return (
    <div className={className ?? ''}>
      <section className="mb-5">
        <LoadingParagraph className="mb-2 h-4 w-72" />
        <div className={gridClasses}>
          {Array(3)
            .fill(0)
            .map((val, index) => {
              return (
                <div className={`${divClasses} w-[250px]`} key={index}>
                  <LoadingParagraph className={imgWrapperClasses} />
                </div>
              );
            })}
          {/* This div fills up the space of the last row */}
          <div className="hidden flex-grow-[999] lg:block"></div>
        </div>
      </section>
      <section className="mb-5">
        <LoadingParagraph className="mb-2 h-4 w-72" />
        <div className={gridClasses}>
          {Array(14)
            .fill(0)
            .map((val, index) => {
              return (
                <div className={`${divClasses} w-[250px]`} key={index}>
                  <LoadingParagraph className={imgWrapperClasses} />
                </div>
              );
            })}
          {/* This div fills up the space of the last row */}
          <div className="hidden flex-grow-[999] lg:block"></div>
        </div>
      </section>
      <section className="mb-5">
        <LoadingParagraph className="mb-2 h-4 w-72" />
        <div className={gridClasses}>
          {Array(5)
            .fill(0)
            .map((val, index) => {
              return (
                <div className={`${divClasses} w-[250px]`} key={index}>
                  <LoadingParagraph className={imgWrapperClasses} />
                </div>
              );
            })}
          {/* This div fills up the space of the last row */}
          <div className="hidden flex-grow-[999] lg:block"></div>
        </div>
      </section>
    </div>
  );
};

export default PhotoLibraryLoader;
