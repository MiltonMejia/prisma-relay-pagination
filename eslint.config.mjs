import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['lib/**', 'node_modules/**'],
	},
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts'],
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			indent: 'off',
			quotes: 'off',
			semi: 'off',
			'linebreak-style': 'off',
		},
	}
);
