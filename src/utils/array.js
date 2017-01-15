export function last(arr) {
    return arr[arr.length - 1];
};

export function closest(arr, num) {
    return arr.reduce((prev, curr) => Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev);
}
